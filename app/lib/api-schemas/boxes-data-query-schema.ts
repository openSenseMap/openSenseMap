import { z } from "zod";
import { DeviceExposureZodEnum } from "../device-enums";
import { parseFiniteNumber } from "~/lib/numbers";
import { StandardResponse } from "~/lib/responses";

const LEGACY_BOX_ID_PARAMETER_NAMES = [
  "boxId",
  "senseboxid",
  "senseboxids",
  "boxid",
  "boxids",
] as const;

const LEGACY_BOXES_DATA_COLUMNS = [
  "createdAt",
  "value",
  "lat",
  "lon",
  "height",
  "unit",
  "boxId",
  "sensorId",
  "phenomenon",
  "sensorType",
  "boxName",
  "exposure",
] as const;

const BoxesDataColumnSchema = z.enum([...LEGACY_BOXES_DATA_COLUMNS, "boxid"]);

export type BoxesDataColumn = z.infer<typeof BoxesDataColumnSchema>;

const parseCoordinate = (value: string): number =>
  parseFiniteNumber(value) ?? Number.NaN;

const StringListSchema = z.union([z.string(), z.array(z.string())]).transform((value) => {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) =>
    String(entry)
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
});

const BboxSchema = z
  .union([
    z.string().transform((value) => value.split(",").map(parseCoordinate)),
    z
      .array(z.union([z.string(), z.number()]))
      .transform((values) =>
        values.map((coordinate) =>
          typeof coordinate === "number" ? coordinate : parseCoordinate(coordinate),
        ),
      ),
  ])
  .refine((coordinates) => coordinates.length === 4 && coordinates.every(Number.isFinite), {
    message: "bbox must contain exactly 4 numeric coordinates",
  })
  .refine(
    ([lngSW, latSW, lngNE, latNE]) =>
      Math.abs(lngSW) <= 180 &&
      Math.abs(lngNE) <= 180 &&
      Math.abs(latSW) <= 90 &&
      Math.abs(latNE) <= 90,
    {
      message:
        "Supplied coordinates are outside of -180, -90, 180, 90 (lngSW, latSW, lngNE, latNE).",
    },
  )
  .refine(([lngSW, latSW, lngNE, latNE]) => lngSW !== lngNE && latSW !== latNE, {
    message: "Supplied bounding box has zero surface area.",
  });

const DateSchema = z
  .string()
  .transform((value) => new Date(value))
  .refine((date) => !isNaN(date.getTime()), {
    message: "date is invalid",
  });

const BoxesDataQuerySchemaBase = z
  .object({
    phenomenon: z.string().optional(),

    boxid: StringListSchema.optional(),
    bbox: BboxSchema.optional(),

    exposure: StringListSchema.pipe(z.array(DeviceExposureZodEnum)).optional(),

    grouptag: z.string().optional(),

    fromDate: DateSchema.optional(),
    toDate: DateSchema.optional(),

    format: z
      .enum(["csv", "json"], {
        error: () => "Format must be either 'csv' or 'json'",
      })
      .default("csv"),

    // Columns to include
    columns: StringListSchema.pipe(z.array(BoxesDataColumnSchema)).default([
      "sensorId",
      "createdAt",
      "value",
      "lat",
      "lon",
    ] as BoxesDataColumn[]),

    download: z
      .union([z.string(), z.boolean()])
      .transform((v) => {
        if (typeof v === "boolean") return v;
        return v !== "false" && v !== "0";
      })
      .default(true),

    delimiter: z.enum(["comma", "semicolon"]).default("comma"),
  })
  // Validate: must have boxid or bbox, but not both
  .superRefine((data, ctx) => {
    if (!data.boxid?.length && !data.bbox && !data.grouptag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "please specify either boxid, bbox or grouptag",
        path: ["boxid"],
      });
    }

    if (data.boxid?.length && data.bbox) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "please specify only boxId or bbox",
        path: ["boxid"],
      });
    }

    if (!data.phenomenon && !data.grouptag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "phenomenon parameter is required when grouptag is not provided",
        path: ["phenomenon"],
      });
    }

    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from-date must not be after to-date",
        path: ["fromDate"],
      });
    }
  })
  .transform((data) => {
    const toDate = data.toDate ?? new Date();
    const fromDate = data.fromDate ?? new Date(toDate.getTime() - 2 * 24 * 60 * 60 * 1000);

    return { ...data, fromDate, toDate };
  });

export type BoxesDataQueryParams = z.infer<typeof BoxesDataQuerySchemaBase>;

/**
 * Parse and validate query parameters from request.
 * Supports both GET query params and POST JSON body.
 */
export async function parseBoxesDataQuery(request: Request): Promise<BoxesDataQueryParams> {
  const url = new URL(request.url);
  const queryParams = searchParamsToRecord(url.searchParams);
  let rawParams: unknown;
  if (request.method !== "GET") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        rawParams = await request.json();
      } catch {
        throw StandardResponse.badRequest("Invalid JSON in request body");
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      try {
        rawParams = formDataToRecord(await request.formData());
      } catch {
        throw StandardResponse.badRequest("Invalid form data");
      }
    } else {
      rawParams = queryParams;
    }
  } else {
    rawParams = queryParams;
  }

  const bodyParams = isRecord(rawParams) ? rawParams : {};
  const params = normalizeLegacyParameters(
    request.method === "GET" ? bodyParams : { ...bodyParams, ...queryParams },
  );

  const parseResult = BoxesDataQuerySchemaBase.safeParse(params);

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    const message = firstError.message || "Invalid query parameters";

    if (
      firstError.path.includes("bbox") ||
      firstError.path.includes("columns") ||
      firstError.path.includes("exposure")
    ) {
      throw StandardResponse.unprocessableContent(message);
    }
    throw StandardResponse.badRequest(message);
  }

  return parseResult.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formDataToRecord(formData: FormData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const name of new Set(formData.keys())) {
    const values = formData.getAll(name).map(String);
    result[name] = values.length === 1 ? values[0] : values;
  }

  return result;
}

function searchParamsToRecord(searchParams: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const name of new Set(searchParams.keys())) {
    const values = searchParams.getAll(name);
    result[name] = values.length === 1 ? values[0] : values;
  }

  return result;
}

function firstDefined(params: Record<string, unknown>, names: readonly string[]): unknown {
  for (const name of names) {
    if (params[name] !== undefined) return params[name];
  }
  return undefined;
}

function normalizeLegacyParameters(params: Record<string, unknown>): Record<string, unknown> {
  return {
    ...params,
    boxid: firstDefined(params, LEGACY_BOX_ID_PARAMETER_NAMES),
    fromDate: firstDefined(params, ["fromDate", "from-date"]),
    toDate: firstDefined(params, ["toDate", "to-date"]),
    delimiter: firstDefined(params, ["delimiter", "separator"]),
  };
}
