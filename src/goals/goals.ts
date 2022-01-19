import EventEmitter from "events";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import { PredictiveFunction } from "./goalTypes";


export interface BaseGoalOptions {
    dynamic: boolean;
    predictive: boolean;
}

export abstract class BaseGoal extends EventEmitter implements BaseGoalOptions {
    
    constructor(public readonly bot: Bot, public readonly target: Entity | Vec3, public readonly dynamic: boolean, public readonly predictive: boolean) {
        super();
    }

    abstract get goalPos(): Vec3;
    abstract get goalPosRaw(): Vec3;
    abstract goalReached(): boolean;
    

    predictiveFunction?: PredictiveFunction;
}

export class StaticGoal extends BaseGoal {
 
    constructor(bot: Bot, public target: Vec3) {
        super(bot, target, false, false);
    }

    get goalPos(): Vec3 {
        return this.target;
    }
    get goalPosRaw(): Vec3 {
       return this.target
    }


    goalReached() {
        return this.bot.entity.position.floored().equals(this.goalPos)
    }

}

export class EntityGoalDynamic extends BaseGoal {

    constructor(bot: Bot, public target: Entity, readonly wantedDistance: number = 1) {
        super(bot, target, false, false);
    }

    public get goalPos(): Vec3 {
        return this.target.position
    }

    public get goalPosRaw(): Vec3 {
        return this.target.position
    }

    goalReached() {
        const {x, y, z} = this.goalPos
        const dx =  x - this.bot.entity.position.x
        const dy = y - this.bot.entity.position.y
        const dz = z - this.bot.entity.position.z
        return (dx * dx + dy * dy + dz * dz) <= this.wantedDistance
    }
}


export class EntityGoalPredictive extends BaseGoal {
 
    constructor(
        bot: Bot,
        public target: Entity,
        public readonly wantedDistance: number = 1,
        public ticksToPredict: number = 10,
        public predictiveFunction: PredictiveFunction = (delta, pos, vel) => {
            const base = Math.round(Math.sqrt(delta.x ** 2 + delta.y ** 2 + delta.z ** 2));
            const tickCount = Math.round((base * this.ticksToPredict) / Math.sqrt(base));
            return pos.plus(vel.scaled(isNaN(tickCount) ? 0 : tickCount));
        }
    ) {
        super(bot, target, true, true);
        this.bot.tracker.trackEntity(target);
    }

    public get goalPos(): Vec3 {
        return this.predictiveFunction(
            this.target.position.minus(this.bot.entity.position),
            this.target.position,
            this.bot.tracker.getEntitySpeed(this.target)
        );
    }

    public get goalPosRaw(): Vec3 {
        return this.target.position;
    }


    goalReached() {
        const {x, y, z} = this.goalPos
        const dx =  x - this.bot.entity.position.x
        const dy = y - this.bot.entity.position.y
        const dz = z - this.bot.entity.position.z
        return (dx * dx + dy * dy + dz * dz) <= this.wantedDistance
    }
}


export class InverseGoal extends BaseGoal {

    constructor( protected goal: BaseGoal){
        super(goal.bot, goal.target, goal.dynamic, goal.predictive)
    }
    
    public get goalPos(): Vec3 {
        return this.goal.goalPos
    }

    public get goalPosRaw(): Vec3 {
        return this.goal.goalPosRaw
    }


    
    goalReached(): boolean {
        return !this.goal.goalReached()
    }


}