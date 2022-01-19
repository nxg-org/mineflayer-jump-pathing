
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import trackerPlugin from "@nxg-org/mineflayer-tracker";
import { Bot } from "mineflayer";
import { JumpPathing } from "./jumpPather";

declare module "mineflayer" {
    interface Bot {
        jumpPather: JumpPathing;
    }
}

export default function plugin(bot: Bot) {
    if (!bot.util) bot.loadPlugin(utilPlugin);
    if (!bot.tracker || !bot.projectiles) bot.loadPlugin(trackerPlugin);
    bot.jumpPather = new JumpPathing(bot);
}
