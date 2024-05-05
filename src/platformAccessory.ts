import { Service, PlatformAccessory, CharacteristicValue } from "homebridge";
import axios from "axios";
import { JSDOM } from "jsdom";

import { ThermometerPlatform } from "./platform";

type StatusType = {
  temperature: number;
  fault: 0 | 1;
};

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ThermometerPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private status: StatusType = {
    temperature: 0,
    fault: 0,
  };

  constructor(
    private readonly platform: ThermometerPlatform,
    private readonly accessory: PlatformAccessory
  ) {
    const url = new URL(accessory.context.device.url);
    const hostname = url.hostname;
    const path = url.pathname;

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        accessory.context.device.manufacturer || hostname
      )
      .setCharacteristic(
        this.platform.Characteristic.Model,
        accessory.context.device.model || path
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        accessory.context.device.serial || accessory.UUID
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.exampleDisplayName
    );

    // create handlers for required characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(() => this.status.temperature);

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    this.updateCurrentTemperature();

    setInterval(() => {
      this.updateCurrentTemperature();
    }, accessory.context.device.refreshInterval * 1000);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async updateCurrentTemperature(): Promise<void> {
    this.platform.log.debug("Triggered GET CurrentTemperature");
    try {
      const response = await axios.get(this.accessory.context.device.url);
      const dom = new JSDOM(response.data);

      const element = dom.window.document.querySelector(
        this.accessory.context.device.elementSelector
      );

      if (!element || !element.textContent) {
        throw new Error("Element not found");
      }

      this.status.temperature = parseFloat(element.textContent);
      this.status.fault = 0;
      this.service
        .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .updateValue(this.status.temperature);
      this.service
        .getCharacteristic(this.platform.Characteristic.StatusFault)
        .updateValue(0);
    } catch (error) {
      this.platform.log.error("Error updating characteristics:", error);
      this.status.fault = 1;
      this.service
        .getCharacteristic(this.platform.Characteristic.StatusFault)
        .updateValue(1);
    }
    // random between 0 and 70
  }
}
