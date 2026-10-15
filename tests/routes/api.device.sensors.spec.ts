import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { generateTestUserCredentials } from "tests/data/generate_test_user";
import { type Route } from "../../.react-router/types/app/routes/+types/api.boxes.$deviceId";
import { BASE_URL } from "../../vitest.setup";
import { createDevice, deleteDevice, getDevice } from "~/db/models/device.server";
import { deleteUserByEmail } from "~/db/models/user.server";
import { type User, type Device } from "~/db/schema";
import { createToken } from "~/lib/jwt";
import { action as deviceUpdateAction } from "~/routes/api.boxes.$deviceId";
import { registerUser } from "~/services/user-service.server";

const DEVICE_TEST_USER = generateTestUserCredentials();

let user: User;
let jwt: string;
let queryableDevice: Device;

const generateMinimalDevice = () => ({
  exposure: "mobile",
  location: { lat: 12.34, lng: 56.78 },
  name: "senseBox" + Date.now(),
});

describe("Device Sensors API: updating sensors", () => {
  beforeAll(async () => {
    await deleteUserByEmail(DEVICE_TEST_USER.email);

    const registration = await registerUser(
      DEVICE_TEST_USER.name,
      DEVICE_TEST_USER.email,
      DEVICE_TEST_USER.password,
      "en_US",
      true,
    );

    if (!registration.ok) {
      throw new Error(`Test setup failed: ${registration.field} -> ${registration.code}`);
    }

    user = registration.user;
    const { token } = await createToken(user);
    jwt = token;

    queryableDevice = await createDevice(
      {
        ...generateMinimalDevice(),
        latitude: 12.34,
        longitude: 56.78,
        sensors: [
          {
            title: "Temperature",
            unit: "°C",
            sensorType: "DHT22",
          },
          {
            title: "Humidity",
            unit: "%",
            sensorType: "DHT22",
          },
          {
            title: "Pressure",
            unit: "hPa",
            sensorType: "BMP280",
          },
          {
            title: "Light",
            unit: "lux",
            sensorType: "TSL2561",
          },
          {
            title: "UV",
            unit: "µW/cm²",
            sensorType: "VEML6070",
          },
        ],
      },
      user.id,
    );
  });

  afterAll(async () => {
    if (queryableDevice) {
      await deleteDevice({ id: queryableDevice.id });
    }

    await deleteUserByEmail(DEVICE_TEST_USER.email);
  });

  it("should allow to add a sensor", async () => {
    const newSensor = {
      title: "PM10",
      unit: "µg/m³",
      sensorType: "SDS 011",
      icon: "osem-particulate-matter",
      new: "true",
      edited: "true",
    };

    const payload = { sensors: [newSensor] };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(200);
    const data = await response.json();

    const addedSensor = data.sensors.find((s: any) => s.title === newSensor.title);
    expect(addedSensor).toBeDefined();
    expect(addedSensor.unit).toBe(newSensor.unit);
    expect(addedSensor.sensorType).toBe(newSensor.sensorType);
    expect(addedSensor.icon).toBe(newSensor.icon);

    const freshDevice = await getDevice({ id: queryableDevice.id });
    const verifiedSensor = freshDevice?.sensors?.find((s: any) => s.title === newSensor.title);
    expect(verifiedSensor).toBeDefined();
  });

  it("should allow to add multiple sensors via PUT", async () => {
    const newSensors = [
      {
        title: "PM2.5",
        unit: "µg/m³",
        sensorType: "SDS 011",
        edited: "true",
        new: "true",
      },
      {
        title: "CO2",
        unit: "ppm",
        sensorType: "MH-Z19",
        edited: "true",
        new: "true",
      },
    ];

    const payload = { sensors: newSensors };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(200);
    const data = await response.json();

    const hasPM25 = data.sensors.some((s: any) => s.title === "PM2.5");
    const hasCO2 = data.sensors.some((s: any) => s.title === "CO2");

    expect(hasPM25).toBe(true);
    expect(hasCO2).toBe(true);

    const freshDevice = await getDevice({ id: queryableDevice.id });
    const verifiedPM25 = freshDevice?.sensors?.some((s: any) => s.title === "PM2.5");
    const verifiedCO2 = freshDevice?.sensors?.some((s: any) => s.title === "CO2");

    expect(verifiedPM25).toBe(true);
    expect(verifiedCO2).toBe(true);
  });

  it("should allow to edit a sensor", async () => {
    const freshDevice = await getDevice({ id: queryableDevice.id });
    const existingSensor = freshDevice?.sensors?.[0];

    if (!existingSensor) {
      throw new Error("No sensors found on device");
    }

    const updatedSensor = {
      _id: existingSensor.id,
      title: "editedTitle",
      unit: "editedUnit",
      sensorType: "editedType",
      icon: "editedIcon",
      edited: "true",
    };

    const payload = { sensors: [updatedSensor] };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(200);
    const data = await response.json();

    const editedSensor = data.sensors.find((s: any) => s._id === existingSensor.id);
    expect(editedSensor).toBeDefined();
    expect(editedSensor.title).toBe(updatedSensor.title);
    expect(editedSensor.unit).toBe(updatedSensor.unit);
    expect(editedSensor.sensorType).toBe(updatedSensor.sensorType);
  });

  it("should allow to delete a single sensor via PUT", async () => {
    const freshDevice = await getDevice({ id: queryableDevice.id });

    if (!freshDevice?.sensors || freshDevice.sensors.length < 2) {
      throw new Error("Not enough sensors to test deletion");
    }

    const sensorToDelete = freshDevice.sensors[0];
    const initialSensorCount = freshDevice.sensors.length;

    const payload = {
      sensors: [
        {
          _id: sensorToDelete.id,
          deleted: true,
        },
      ],
    };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sensors).toHaveLength(initialSensorCount - 1);

    const deletedSensorStillExists = data.sensors.some((s: any) => s._id === sensorToDelete.id);
    expect(deletedSensorStillExists).toBe(false);

    const updatedDevice = await getDevice({ id: queryableDevice.id });
    expect(updatedDevice?.sensors?.length).toBe(initialSensorCount - 1);
  });

  it("should allow to delete multiple sensors at once", async () => {
    const freshDevice = await getDevice({ id: queryableDevice.id });

    if (!freshDevice?.sensors || freshDevice.sensors.length < 3) {
      throw new Error("Not enough sensors to test deletion");
    }

    const sensorsToDelete = freshDevice.sensors.slice(0, 2).map((s: any) => ({
      _id: s.id,
      deleted: true,
    }));

    const initialSensorCount = freshDevice.sensors.length;

    const payload = { sensors: sensorsToDelete };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sensors).toHaveLength(initialSensorCount - 2);

    const remainingSensors = data.sensors.map((s: any) => s._id);

    sensorsToDelete.forEach((s: any) => {
      expect(remainingSensors).not.toContain(s._id);
    });

    const updatedDevice = await getDevice({ id: queryableDevice.id });
    expect(updatedDevice?.sensors?.length).toBe(initialSensorCount - 2);
  });

  it("should NOT allow to delete all sensors", async () => {
    const freshDevice = await getDevice({ id: queryableDevice.id });

    if (!freshDevice?.sensors) {
      throw new Error("No sensors found on device");
    }

    const allSensors = freshDevice.sensors.map((s: any) => ({
      _id: s.id,
      deleted: true,
    }));

    const payload = { sensors: allSensors };

    const request = new Request(`${BASE_URL}/${queryableDevice.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    }) as unknown as Request;

    const response = await deviceUpdateAction({
      request,
      params: { deviceId: queryableDevice?.id },
    } as Route.ActionArgs);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("Bad Request");
    expect(data.message).toContain("Unable to delete sensor");

    const unchangedDevice = await getDevice({ id: queryableDevice.id });
    expect(unchangedDevice?.sensors?.length).toBe(freshDevice.sensors.length);
  });
});
