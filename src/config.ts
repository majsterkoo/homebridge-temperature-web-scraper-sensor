import { AccessoryConfig } from "homebridge";

export class NetworkDeviceConfig {
  name = "My NetworkDevice";

  manufacturer = "homebridge-web-scraper-sensor";
  model = "NetworkDevice";
  serialNumber: string;

  url: string | null = null;
  elementSelector: string | null = null;
  refreshInterval: number = 60;

  constructor(config: AccessoryConfig) {
    // WARNING!
    // This code might be dangerous, if you're going alone, please take this:
    //       /| _________________
    // O|===|* >________________/
    //       \|
    // Jokes aside, this code is really nasty. If you know of a better way
    // of solving it, please consider contributing:
    // https://github.com/AlexGustafsson/homebridge-wol#contribute

    this.name = this.getString(config, "name", this.name) as string;

    this.manufacturer = this.getString(
      config,
      "manufacturer",
      this.manufacturer
    ) as string;
    this.model = this.getString(config, "model", this.model) as string;
    this.serialNumber = this.getString(
      config,
      "serialNumber",
      new Array(4)
        .fill(null)
        .map((_) => Math.round(Math.random() * 1e5).toString())
        .join("-")
    ) as string;

    this.url = this.getString(config, "url", this.url);
    this.elementSelector = this.getString(
      config,
      "elementSelector",
      this.elementSelector
    );
    this.refreshInterval = this.getNumber(
      config,
      "refreshInterval",
      this.refreshInterval
    );
  }

  private getString(
    config: AccessoryConfig,
    key: string,
    defaultValue: string | null
  ): string | null {
    if (typeof config[key] === "undefined") {
      return defaultValue;
    }

    const type = typeof config[key];
    if (type !== "string") {
      throw new Error(
        `Got incorrect value type for config key '${key}' expected string, got '${type}'`
      );
    }

    return config[key] as string;
  }

  private getNumber(
    config: AccessoryConfig,
    key: string,
    defaultValue: number
  ): number {
    if (typeof config[key] === "undefined") {
      return defaultValue;
    }

    const type = typeof config[key];
    if (type !== "number") {
      throw new Error(
        `Got incorrect value type for config key '${key}' expected number, got '${type}'`
      );
    }

    return config[key] as number;
  }
}
