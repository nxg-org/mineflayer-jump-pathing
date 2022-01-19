import { createBot, EquipmentDestination } from "mineflayer";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import tracker from "@nxg-org/mineflayer-tracker";
import { Vec3 } from "vec3";
import { JumpPathing } from "./jumpPather";
import { GoalFactory } from "./goals";

const bot = createBot({
    username: "jump-pathing",
    host: "minecraft.next-gen.dev",
    port: 25565,
    version: "1.16.5",
});

bot.physics.yawSpeed = 50;

bot.loadPlugin(utilPlugin);
bot.loadPlugin(tracker);

const clas = new JumpPathing(bot);

function parseMessage(username: string, message: string) {
    console.log("<" + username + "> " + message);
    const msg = message.split(" ");

    switch (msg[0].toLowerCase()) {
        case "inventory":
            const item = bot.util.inv.findItem(msg[1]);
            if (item) bot.util.inv.customEquip(item, msg[2] as EquipmentDestination);

            break;
        case "walk":
            bot.setControlState("forward", true);
            break;
        case "run":
            bot.setControlState("forward", true);
            bot.setControlState("sprint", true);
            break;
        case "jump":
            bot.setControlState("jump", true);
            bot.setControlState("jump", false);
            break;
        case "stop":
            clas.stop();
            break;
        case "maxsearch":
            if (parseInt(msg[1])) clas.searchDepth = parseInt(msg[1]);

            console.log("highest possible simulated jumps is " + clas.searchDepth);
            bot.chat("highest possible simulated jumps is " + clas.searchDepth);
            break;
        case "goto":
            if (parseInt(msg[4])) clas.searchDepth = parseInt(msg[4]);
            if (msg.length === 2) {
                const entity = bot.nearestEntity((e) => !!e.username?.includes(msg[1]) || !!e.name?.includes(msg[1]));
                if (!entity) return;
                const goal = GoalFactory.gotoEntity(bot, entity);
                clas.goto(goal);
            } else {
                const goal1 = GoalFactory.gotoPos(bot, new Vec3(parseInt(msg[1]), parseInt(msg[2]), parseInt(msg[3])));
                clas.goto(goal1);
            }
            break;
        case "follow":
            const entity = bot.nearestEntity((e) => !!e.username?.includes(msg[1]) || !!e.name?.includes(msg[1]));
            if (!entity) return;
            const goal2 = GoalFactory.followEntity(bot, entity, parseInt(msg[2]), true);
            if (parseInt(msg[3])) clas.searchDepth = parseInt(msg[3]);
            clas.goto(goal2);

            break;
    }
}

bot.on("chat", parseMessage);
