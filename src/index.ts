import {
  ClusterManager,
  type Cluster,
} from "discord-hybrid-sharding";
import configGrabber from "./utils/configGrabber.js";

import logger from "./logger.js";

const config: void | Config = configGrabber();

if (!config.token) {
  logger.error("Config error, exiting", "main thread");
  process.exit(255);
}

const manager: ClusterManager = new ClusterManager("./out/bot.js", {
  totalShards: "auto",
  shardsPerClusters: 2,
  mode: "process",
  token: config.token,
});

if (config.debug ?? false) manager.on("debug", logger.debug);

manager.on("clusterCreate", (cluster: Cluster) => {
  logger.info(`Created cluster ${cluster.id}`, "main thread");
});

manager.spawn();
