import { type Route } from "./+types/api.users.confirm-email";
import { z } from "zod";
import { type ZodOpenApiPathItemObject } from "zod-openapi";
import {
  BadRequestErrorSchema,
  badRequestResponse,
  ForbiddenErrorSchema,
  forbiddenResponse,
  InternalServerErrorSchema,
  internalServerErrorResponse,
  UnsupportedMediaTypeErrorSchema,
  unsupportedMediaTypeResponse,
} from "~/lib/openapi/errors";
import { parseJsonOrFormRequest } from "~/lib/request-parsing";
import { StandardResponse } from "~/lib/responses";
import { confirmEmail } from "~/services/user-service.server";
import { OkMessageResponseSchema } from "~/lib/openapi/schemas/common";

const ConfirmEmailRequestSchema = z
  .object({
    email: z.email().optional().meta({
      description: "Legacy email field. The confirmation token identifies the account.",
      example: "user@example.com",
    }),
    token: z.string().trim().min(1, "No email confirmation token specified."),
  })
  .meta({
    id: "ConfirmEmailRequest",
    description: "Email confirmation payload.",
  });

export const openapi: ZodOpenApiPathItemObject = {
  post: {
    tags: ["Authentication"],
    summary: "Confirm email address",
    description:
      "Confirms an email address using the token sent to the user. JSON and form payloads are accepted.",
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: ConfirmEmailRequestSchema },
        "application/x-www-form-urlencoded": {
          schema: ConfirmEmailRequestSchema,
        },
        "multipart/form-data": { schema: ConfirmEmailRequestSchema },
      },
    },
    responses: {
      200: {
        description: "Email address confirmed successfully.",
        content: {
          "application/json": { schema: OkMessageResponseSchema },
        },
      },
      400: badRequestResponse(
        BadRequestErrorSchema,
        "Invalid request body or missing confirmation token.",
      ),
      403: forbiddenResponse(ForbiddenErrorSchema, "Invalid or expired confirmation token."),
      415: unsupportedMediaTypeResponse(
        UnsupportedMediaTypeErrorSchema,
        "Unsupported content type.",
      ),
      500: internalServerErrorResponse(InternalServerErrorSchema, "Internal server error."),
    },
  },
};

export const action = async ({ request }: Route.ActionArgs) => {
  const requestData = await parseJsonOrFormRequest(request, ConfirmEmailRequestSchema);
  if (requestData instanceof Response) return requestData;

  try {
    const result = await confirmEmail(requestData.token);

    if (result === "success") {
      return StandardResponse.ok({
        code: "Ok",
        message: "E-Mail successfully confirmed. Thank you",
      });
    }

    if (result === "expired") {
      return StandardResponse.forbidden("Invalid or expired confirmation token.");
    }

    return StandardResponse.forbidden("Invalid or expired confirmation token.");
  } catch {
    return StandardResponse.internalServerError();
  }
};
