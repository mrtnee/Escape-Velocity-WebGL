import Node from './node.js';

const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export default class Checkpoint extends Node {

    constructor() {
        super();
        this.scale = vec3.fromValues(20, 20, 20);

        // Checkpoint main position
        this.position = vec3.fromValues(0, 1, 0);

        // Current current translation (updated every frame)
        this.translation = vec3.fromValues(0, 0, 0);

        // The player, who picked up this checkpoint
        this.spaceshipReference = null;

        // Tells us how much time to wait before animating this checkpoint
        this.delay = Math.random() * 2 * Math.PI;

        // How much time the checkpoint needs for one rotation
        this.rotationSpeed = 2000;

        // How fast and for how much the object is moving up and down
        this.translationSpeed = 1000;  // 1000 ms
        this.translationAmplitude = 15; // 3 units up and down
    }

    update(delta) {
        // Get current date, we will use it to calculate rotation and translation
        let now = new Date();

        // Move the cube up and down
        let currentY = (1 + Math.sin(now / this.translationSpeed + this.delay)) * this.translationAmplitude;
        this.translation = vec3.clone(this.position);
        vec3.add(this.translation, this.translation, [0, currentY, 0]);

        // Rotate the cube around its y axis
        let currentRotation = now / this.rotationSpeed + this.delay;

        // Calculate the transformation matrix
        this.transform = mat4.create();
        mat4.translate(this.transform, this.transform, this.translation);
        mat4.rotateY(this.transform, this.transform, currentRotation);
        mat4.scale(this.transform, this.transform, this.scale);
    }

}