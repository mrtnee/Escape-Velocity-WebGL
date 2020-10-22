import Node from './node.js';
import { Action } from './input.js';
import * as WebGL from './lib/WebGL.js';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const quat = glMatrix.quat;

let ammo = 120;

const DRIFTING_FACTOR = 0.75;

export default class KinematicBody extends Node {
    constructor(keyboardController, keyRemapper, color, gl) {
        super();

        Object.assign(this, {
            rotation: vec3.fromValues(0, 0, 0),
            translation: vec3.fromValues(0, 2, 0),
            velocity: vec3.fromValues(0, 0, 1),
            velDir: vec4.fromValues(0, 0, 1, 0),
            color: vec3.clone(color),
            mouseSensitivity: 0.002,
            maxSpeed: 700,
            minSpeed: 50,
            friction: 50,
            acceleration: 100,
            speed: 50,
            xAxisRotation: 1.2,
            yAxisRotation: 1.2,
            zAxisRotation: 2,
            qRotation: quat.fromValues(0, 0, 0, 1),
            oldForward: vec3.fromValues(0, 0, -1),
            oldRight: vec3.fromValues(1, 0, 0),
            oldUp: vec3.fromValues(0, 1, 0),
            opponent: null,
            laser: null,
            dead: false
        });

        this.texture = WebGL.createTexture(gl, {
            data: new Uint8Array([this.color[0], this.color[1], this.color[2], 255]),
            width: 1,
            height: 1
        });

        this.keyboardController = keyboardController;

        // This remapper is used to map different keys to different spaceships
        this.keyRemapper = keyRemapper;
    }

    isKeyPressed(action) {
        if (action in this.keyRemapper) {
            let mapping = this.keyRemapper[action];
            return this.keyboardController.isKeyPressed(mapping);
        }
        return false;
    }

    update(dt, gameStarted) {
        let allowControls = gameStarted && !this.dead;
        this.update2(dt, allowControls);
    }

    // also take into consideration previous velocity vector
    update2(dt, allowControls) {
        const b = this;

        const wKey = this.isKeyPressed(Action.FORWARD);
        const sKey = this.isKeyPressed(Action.BACKWARD);
        const aKey = this.isKeyPressed(Action.LEFT);
        const dKey = this.isKeyPressed(Action.RIGHT);
        const shiftKey = this.isKeyPressed(Action.ACCELERATE);
        const spaceKey = this.isKeyPressed(Action.SHOOT);

        var deltaRotation = vec3.create();
        if (allowControls) {
            if (wKey) {
                deltaRotation[0] += dt * b.xAxisRotation;
            } else if (sKey) {
                deltaRotation[0] -= dt * b.xAxisRotation;
            }
            if (aKey) {
                deltaRotation[2] -= dt * b.zAxisRotation;
            } else if (dKey) {
                deltaRotation[2] += dt * b.zAxisRotation;
            }
            if (shiftKey) {
                b.speed = b.speed + b.acceleration * dt;
            }
            else {
                b.speed = b.speed - b.friction * dt;
            }

            // check if speed is within bounds
            if (b.speed >= b.maxSpeed) {
                b.speed = b.maxSpeed;
            } else if (b.speed < b.minSpeed) {
                b.speed = b.minSpeed;
            }
        }

        // calculate new rotation of the spaceship (quaternion)
        b.qRotation = this.calculateNewRotation(deltaRotation);

        // calculate rotation matrix from quaternion
        let rotMatrix = this.quatToRotationMatrix(b.qRotation);

        // calculate new velocity direction vector
        let oldVelDir = b.velDir;
        let newVelDir = vec4.create();
        vec4.transformMat4(newVelDir, vec4.fromValues(0, 0, 1, 0), rotMatrix);
        let interpolatedVelDir = vec4.create();
        vec4.lerp(interpolatedVelDir, newVelDir, oldVelDir, DRIFTING_FACTOR);
        b.velDir = interpolatedVelDir;
        b.velDir[3] = 0;
        let vel = this.vec4to3(interpolatedVelDir);

        // apply the rotation and translation and set new transform of model
        let t = b.transform;
        mat4.identity(t);
        // update translation
        vec3.scaleAndAdd(b.translation, b.translation, vel, dt * b.speed);
        // translate the rotation matrix first
        mat4.translate(t, t, b.translation);
        mat4.mul(t, t, rotMatrix);

        // calculate new prevRigth and prevForward
        let newRight = vec4.fromValues(1, 0, 0, 0);
        let newForward = vec4.fromValues(0, 0, 1, 0);
        vec4.transformMat4(newRight, newRight, rotMatrix);
        vec4.transformMat4(newForward, newForward, rotMatrix);

        // set the previous forward and right to new ones
        b.oldForward = newForward;
        b.oldRight = newRight;


        if (spaceKey && ammo > 0) {
            this.shoot();
            if (this.children.length == 0) {
                this.addChild(this.laser);
            }
            ammo = ammo - 4;
        }
        else {
            if (this.children.length == 1) {
                this.removeChild(this.children[0]);
            }
            if (ammo < 120) {
                ammo++;
            }
        }
    }

    shoot() {
        // get rotation
        let rotation = this.quatToRotationMatrix(this.qRotation);

        // calculate direction of the ship
        let direction = vec4.fromValues(0, 0, 1, 0);
        vec4.transformMat4(direction, direction, rotation);
        direction = this.vec4to3(direction);
        vec3.normalize(direction, direction);

        // calculate vector from this to opponent
        let t = this.translation;
        let o = this.opponent.translation;
        let a = Math.abs;
        let directionToOpponent = vec3.fromValues((o[0] - t[0]), (o[1] - t[1]), (o[2] - t[2]));
        let angle = Math.atan(5 / vec3.len(directionToOpponent));
        vec3.normalize(directionToOpponent, directionToOpponent);

        let dotProduct = vec3.dot(direction, directionToOpponent);
        // let minDotProduct = Math.cos(Math.PI / 720);
        let minDotProduct = Math.cos(angle);

        if (dotProduct > minDotProduct) {
            this.opponent.translation = vec3.fromValues(0, 0, 0);
        }
    }

    // new updated controls
    update0(dt) {
        const b = this;

        let q = quat.create();

        const wKey = this.isKeyPressed(Action.FORWARD);
        const sKey = this.isKeyPressed(Action.BACKWARD);
        const aKey = this.isKeyPressed(Action.LEFT);
        const dKey = this.isKeyPressed(Action.RIGHT);
        const shiftKey = this.isKeyPressed(Action.ACCELERATE);
        const spaceKey = this.isKeyPressed(Action.SHOOT);

        var deltaRotation = vec3.create();
        if (wKey) {
            deltaRotation[0] += dt * b.xAxisRotation;
        } else if (sKey) {
            deltaRotation[0] -= dt * b.xAxisRotation;
        }
        if (aKey) {
            deltaRotation[2] += dt * b.yAxisRotation;
        } else if (dKey) {
            deltaRotation[2] -= dt * b.yAxisRotation;
        }
        if (shiftKey) {
            b.speed = b.speed + b.acceleration * dt;
        }
        else {
            b.speed = b.speed - b.friction * dt;
        }

        // check if speed is within bounds
        if (b.speed >= b.maxSpeed) {
            b.speed = b.maxSpeed;
        } else if (b.speed < b.minSpeed) {
            b.speed = b.minSpeed;
        }

        // get previous right vector and prev forward vector
        let prevRight = b.prevRight;
        let prevForward = b.prevForward;

        // get z-axis quaternion and x-axis quaternion
        let qz = quat.create();
        let qx = quat.create();
        quat.setAxisAngle(qz, prevForward, deltaRotation[2]);
        quat.setAxisAngle(qx, prevRight, deltaRotation[0]);

        // multiply the quaternions
        let result = quat.create();
        quat.mul(result, qx, qz);
        quat.mul(b.qRotation, result, b.qRotation);

        // get rotation matrix from quaternions
        let rotationMatrix = mat4.create();
        mat4.fromQuat(rotationMatrix, b.qRotation);

        // apply the rotation and translation and set new transform of model
        let t = b.transform;
        mat4.identity(t);
        // calculate the transform of the spaceship
        let vel = b.velocity;
        let vel4 = vec4.fromValues(vel[0], vel[1], vel[2], 0);
        vec4.transformMat4(vel4, vel4, rotationMatrix);
        vel = vec3.fromValues(vel4[0], vel4[1], vel4[2]);
        // update translation
        vec3.scaleAndAdd(b.translation, b.translation, vel, dt * b.speed);
        // translate the rotation matrix first
        mat4.translate(t, t, b.translation);
        mat4.mul(t, t, rotationMatrix);

        // calculate new prevRight and prevForward
        let smth_r = vec4.fromValues(1, 0, 0, 0);
        let smth_f = vec4.fromValues(0, 0, -1, 0);
        vec4.transformMat4(smth_r, smth_r, rotationMatrix);
        vec4.transformMat4(smth_f, smth_f, rotationMatrix);

        // set the previous forward and right vectors to new ones
        b.prevForward = smth_f;
        b.prevRight = smth_r;
    }

    // shorten update0
    update1(dt) {
        const b = this;

        const wKey = this.isKeyPressed(Action.FORWARD);
        const sKey = this.isKeyPressed(Action.BACKWARD);
        const aKey = this.isKeyPressed(Action.LEFT);
        const dKey = this.isKeyPressed(Action.RIGHT);
        const shiftKey = this.isKeyPressed(Action.ACCELERATE);
        const spaceKey = this.isKeyPressed(Action.SHOOT);

        var deltaRotation = vec3.create();
        if (wKey) {
            deltaRotation[0] += dt * b.xAxisRotation;
        } else if (sKey) {
            deltaRotation[0] -= dt * b.xAxisRotation;
        }
        if (aKey) {
            deltaRotation[2] -= dt * b.yAxisRotation;
        } else if (dKey) {
            deltaRotation[2] += dt * b.yAxisRotation;
        }
        if (shiftKey) {
            b.speed = b.speed + b.acceleration * dt;
        }
        else {
            b.speed = b.speed - b.friction * dt;
        }

        // check if speed is within bounds
        if (b.speed >= b.maxSpeed) {
            b.speed = b.maxSpeed;
        } else if (b.speed < b.minSpeed) {
            b.speed = b.minSpeed;
        }

        // calculate new rotation of the spaceship (quaternion)
        b.qRotation = this.calculateNewRotation(deltaRotation);

        // calculate rotation matrix from quaternion
        let rotMatrix = this.quatToRotationMatrix(b.qRotation);

        // apply the rotation and translation and set new transform of model
        let t = b.transform;
        mat4.identity(t);
        let vel = b.velocity;
        let vel4 = this.vec3to4(vel, 0);
        vec4.transformMat4(vel4, vel4, rotMatrix);
        vel = this.vec4to3(vel4);
        // update translation
        vec3.scaleAndAdd(b.translation, b.translation, vel, dt * b.speed);
        // translate the rotation matrix first
        mat4.translate(t, t, b.translation);
        mat4.mul(t, t, rotMatrix);

        // calculate new prevRigth and prevForward
        let newRight = vec4.fromValues(1, 0, 0, 0);
        let newForward = vec4.fromValues(0, 0, 1, 0);
        vec4.transformMat4(newRight, newRight, rotMatrix);
        vec4.transformMat4(newForward, newForward, rotMatrix);

        // set the previous forward and right to new ones
        b.oldForward = newForward;
        b.oldRight = newRight;
    }

    // returns a quaternion that rotates around axis <axis> for angle <angle>
    quatAxisAngle(axis, angle) {
        let q = quat.create();
        quat.setAxisAngle(q, axis, angle);
        return q;
    }

    // return product of two quaternions
    mulQuat(q, p) {
        let result = quat.create();
        quat.mul(result, q, p);
        return result;
    }

    quatToRotationMatrix(q) {
        let rotMtrx = mat4.create();
        mat4.fromQuat(rotMtrx, q);
        return rotMtrx;
    }

    vec3to4(v, s) {
        return vec4.fromValues(v[0], v[1], v[2], s);
    }

    vec4to3(v) {
        return vec3.fromValues(v[0], v[1], v[2]);
    }

    calculateNewRotation(dr) {
        const b = this;

        let oldRight = b.oldRight;
        let oldForward = b.oldForward;

        // get rotation quaternions around given axis for given angle
        let qz = this.quatAxisAngle(oldForward, dr[2]);
        let qx = this.quatAxisAngle(oldRight, dr[0]);

        // multiply the quaternions -> get the change in rotation
        let q = this.mulQuat(qx, qz);
        // calculate new rotation of the spaceship by multiplying the
        // change in rotation with previous rotation of the spaceship
        q = this.mulQuat(q, b.qRotation);     // <-- rotate b.qRotation for q

        return q;
    }
}