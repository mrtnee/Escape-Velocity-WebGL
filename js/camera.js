import Node from './node.js';
import KinematicBody from './kinematicBody.js';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const quat = glMatrix.quat;


let count = 61;

const ROTATION_INTERPOLATION = 0.9;
const TRANSLATION_INTERPOLATION = 0.5;
const UP_CAMERA_OFFSET = 2;
const MAX_DISTANCE_FROM_SPACESHIP = 40;
const MIN_DISTANCE_FROM_SPACESHIP = 25;

export default class Camera extends Node {

    constructor(translation, rotation) {
        super();

        Object.assign(this, {
            projection       : mat4.create(),
            rotation         : vec3.create(),
            translation      : vec3.create(),
            spaceship        : null,
            oldQRotation     : quat.create(),
            currQRotation    : quat.create(),
            grayscale: false
        });

        if (translation != null)
            this.translation = vec3.clone(translation);
        
        if (rotation != null)
            this.rotation = vec3.clone(rotation);
        
        this.recalculateTransformationMatrix();
    }

    recalculateTransformationMatrix() {
        // Calculate the transformation matrix based on camera position and rotation
        mat4.identity(this.transform);
        mat4.fromTranslation(this.transform, this.translation);
        mat4.rotateX(this.transform, this.transform, this.rotation[0]);
        mat4.rotateY(this.transform, this.transform, this.rotation[1]);
        mat4.rotateZ(this.transform, this.transform, this.rotation[2]);
    }

    update(dt) {
        /** @type {KinematicBody} */
        const ship = this.spaceship;

        if (++count > 60) {
            count = 0;
            // console.log(ship.qRotation);
        }

        // first make camera follow the plane
        let newTranslation = vec3.clone(ship.translation);

        let t = this.transform;
        mat4.identity(t);

        // then translate the same as ship
        mat4.translate(t, t, newTranslation);

        let shipRotation = ship.qRotation;
        let oldRotation = this.oldQRotation;
        let newRotation = quat.create();
        quat.lerp(newRotation, shipRotation, oldRotation, ROTATION_INTERPOLATION);


        // obtain ship's rotation matrix
        let rotMatrix = ship.quatToRotationMatrix(newRotation);


        // now rotate the camera into the same direction as
        // the spaceship
        mat4.mul(t, t, rotMatrix);

        
        mat4.rotateY(t, t, Math.PI);

        
        // first translate the camera to the correct distance
        // from the spaceship
        // using a linear function calculate distance from ship
        let k = (MAX_DISTANCE_FROM_SPACESHIP - MIN_DISTANCE_FROM_SPACESHIP) / (ship.maxSpeed - ship.minSpeed);
        let n = MAX_DISTANCE_FROM_SPACESHIP - k * ship.maxSpeed;
        let distanceFromShip = k * ship.speed + n;
        mat4.translate(t, t, vec3.fromValues(0, UP_CAMERA_OFFSET, distanceFromShip));
        
        
        // for some reason the camera is turned into the wrong
        // direction so we rotate it 180° around the up axis of
        // the spaceship
        rotMatrix = ship.quatAxisAngle(ship.oldUp, Math.PI);
        // mat4.mul(t, t, rotMatrix);

        this.translation = newTranslation;
        this.oldQRotation = newRotation;
    }
}
