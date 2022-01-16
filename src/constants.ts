import { Vec3 } from "vec3";
const {PlayerState} = require("prismarine-physics")

export type TestState = { state: /* typeof PlayerState */ any; parent?: TestState; open: boolean };
export type TestEntity = {
    type: string;
    position: Vec3;
    velocity?: Vec3;
    height: number;
    width?: number;
    isValid: boolean;
};

export const PIOver2 = Math.PI / 2;
export const PIOver8 = Math.PI / 8;
export const emptyVec = new Vec3(0, 0, 0);

export const forwardSprintJump = {
    forward: true,
    back: false,
    left: false,
    right: false,
    jump: true,
    sprint: true,
    sneak: false,
};