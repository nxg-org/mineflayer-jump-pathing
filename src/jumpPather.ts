import { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import { Bot, createBot, EquipmentDestination } from "mineflayer";
import utilPlugin, { AABB, AABBUtils } from "@nxg-org/mineflayer-util-plugin";
import test from "@nxg-org/mineflayer-tracker";
import EventEmitter from "events";
import { emptyVec, forwardSprintJump, PIOver2, PIOver8, TestEntity, TestState } from "./constants";
import { BaseGoal } from "./goals";
const { PlayerState } = require("prismarine-physics");

// interface Controls {
//     forward: boolean,
//     back: boolean,
//     left: boolean,
//     right: boolean,
//     jump: boolean,
//     sprint: boolean,
//     sneak: boolean
// }


//TODO: Write goal classes instead of manually defining.
//TODO: Perhaps write a better prediction algorithm? this one already works pretty flawlessly.
//TODO: Incorporate *actual* pathfinding. Lol.




function GoalToPosDist(target: Vec3, origin: Vec3) {
    return AABBUtils.getEntityAABBRaw({ position: target, height: 1.8, width: 0.6 }).distanceToVec(origin);
}

export class JumpPathing extends EventEmitter {
    public searchDepth: number;
    public goal: BaseGoal | null;
    public nextLandingPosition?: Vec3;
    public plannedJumps: Vec3[];
    private potentialLandingPositions: TestState[];

    constructor(private bot: Bot) {
        super();
        this.searchDepth = 2;
        this.goal = null;
        this.plannedJumps = [];
        this.potentialLandingPositions = [];

        this.on("reachedGoal", this.stop);
    }

    goto(goal: BaseGoal) {
        this.goal = goal;
        if (this.goal.dynamic) {
            this.bot.on("physicsTick", this.perTick);
            this.bot.tracker.trackEntity(this.goal.target as Entity);
        } else {
            this.resetInfo();
            this.simulateJump(new PlayerState(this.bot, forwardSprintJump), this.searchDepth);
            this.performJumps();
        }
    }

    stop() {
        this.bot.removeListener("physicsTick", this.perTick);
        this.resetEverything();
    }

    private perTick = () => {
        if (this.bot.entity.onGround && this.goal?.dynamic) {
            this.resetInfo();
            this.simulateJump(new PlayerState(this.bot, forwardSprintJump), this.searchDepth);
        }
        if (this.nextLandingPosition) {
            this.bot.setControlState("forward", true);
            this.bot.setControlState("sprint", true);
            this.bot.setControlState("jump", true);
            this.bot.lookAt(this.nextLandingPosition.offset(0, 1.6, 0), true);
        }
    };

    resetInfo() {
        this.plannedJumps = [];
        this.potentialLandingPositions = [];
        this.nextLandingPosition = undefined;
    }

    resetEverything() {
        this.resetInfo();
        this.bot.clearControlStates();
    }

    //manually called for non-dynamic goals.
    performJumps = async () => {
        if (this.plannedJumps.length === 0) {
            this.resetInfo();
            this.emit("invalidPath", this.goal);
            return;
        }
        while (this.bot.entity.position.distanceTo(this.plannedJumps[0]) > 1) {
            if (this.bot.entity.onGround) {
                this.resetInfo();
                this.simulateJump(new PlayerState(this.bot, forwardSprintJump), this.searchDepth);
            }
            if (this.nextLandingPosition && this.goal) {
                this.bot.setControlState("forward", true);
                this.bot.setControlState("sprint", true);
                this.bot.setControlState("jump", true);
                this.bot.lookAt(this.nextLandingPosition.offset(0, 1.6, 0), true);
            }
            await this.bot.waitForTicks(1);
        }
        this.resetInfo();
        this.emit("reachedGoal", this.goal);
    };

    simulateJump(playerState: any, searchDepth: number, parentJumpPos?: TestState) {
        if (!this.goal) return;

        let bestLandingPos: TestState;
        const targetPos: Vec3 = this.goal.goalPos;
        const deltaPos: Vec3 = targetPos.minus(playerState.pos);

        //assign new yaw for base state.
        playerState.yaw = Math.atan2(-deltaPos.x, -deltaPos.z);

        // begin testing potential jumps from offset of ideal yaw.
        for (let testYaw = playerState.yaw - PIOver2; testYaw < playerState.yaw + PIOver2; testYaw += PIOver8) {
            const stateCopy = JSON.parse(JSON.stringify(playerState)); //deep clone.
            stateCopy.pos = new Vec3(stateCopy.pos.x, stateCopy.pos.y, stateCopy.pos.z);
            stateCopy.vel = new Vec3(stateCopy.vel.x, stateCopy.vel.y, stateCopy.vel.z);
            stateCopy.yaw = testYaw;

            // simulate for thirty ticks.
            for (let ticks = 0; ticks < 30; ticks++) {
                (this.bot.physics as any).simulatePlayer(stateCopy, this.bot.world); //patch later
                if (stateCopy.onGround || stateCopy.isInWater || stateCopy.isInLava) break;
            }

            // append good jump and leave open for potential children jumps.
            if (stateCopy.onGround) this.potentialLandingPositions.push({ state: stateCopy, parent: parentJumpPos, open: true });
        }
        this.potentialLandingPositions = this.potentialLandingPositions.filter((a) => a.open);

        if (this.potentialLandingPositions.length > 0) {

            // get most promising state. (closest by distance)
            bestLandingPos = this.potentialLandingPositions.sort(
                (a, b) => GoalToPosDist(targetPos, a.state.pos) - GoalToPosDist(targetPos, b.state.pos)
            )[0];

            // decide whether state is good enough OR decide to stop searching due to max search count
            if (GoalToPosDist(targetPos, bestLandingPos.state.pos) < 1.5 || searchDepth <= 0) {

                // push to jumpTargets the jumps necessary to reach the goal, up to allowed limit / cut-off point.
                let searcher = bestLandingPos;
                while (searcher.parent) {
                    this.plannedJumps.push(searcher.state.pos);
                    searcher = searcher.parent;
                }
                this.plannedJumps.push(searcher.state.pos);
                this.nextLandingPosition = searcher.state.pos;

            } else if (searchDepth > 0) {

                //close off parent so no children are searched from this node.
                bestLandingPos.open = false;
                this.simulateJump(bestLandingPos.state, searchDepth - 1, bestLandingPos);
            }
        } else {
            // this.bot.chat("nothing to jump on...");
            this.emit("pathingFailed", "lava_or_water");
        }
    }
}


