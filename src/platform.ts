import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  AccessoryConfig,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { ThermometerPlatformAccessory } from "./platformAccessory";
import { NetworkDeviceConfig } from "./config";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class ThermometerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private myConfig: NetworkDeviceConfig | null = null;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log = log;
    // TODO: Type FIX
    this.myConfig = new NetworkDeviceConfig(
      config as unknown as AccessoryConfig
    );

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on("didFinishLaunching", () => {
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    const accessoriesToRemove = this.accessories.filter((accessory) => {
      // Check if the UUID of an existing accessory is not in the list of UUIDs in thermometers.
      return !this.config.thermometers.some(
        (device) => this.api.hap.uuid.generate(device.name) === accessory.UUID
      );
    });

    // removes platform accessories when no longer present
    if (accessoriesToRemove.length > 0) {
      this.api.unregisterPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        accessoriesToRemove
      );
      this.log.info(
        "Removing accessories no longer present from cache:",
        accessoriesToRemove.map((accessory) => accessory.displayName)
      );
    }

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.thermometers) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(
        `${device.url}_${device.elementSelector}`
      );

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid
      );

      if (existingAccessory) {
        // the accessory already exists
        this.log.info(
          "Restoring existing accessory from cache:",
          existingAccessory.displayName
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new ThermometerPlatformAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info("Adding new accessory:", device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new ThermometerPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
