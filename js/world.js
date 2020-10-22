import Node from './node.js';
import * as Models from './models.js';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

export default class World extends Node {

    constructor(renderer) {
        super();

        // Save the reference to the renderer in this node
        this.renderer = renderer;

        // The number of triangles will be 2 * (TERRAIN_SIZE ^ 2)
        this.TERRAIN_SIZE = 50;

        // The scale of our world
        this.scale = [64 * 2, 10 * 2, 64 * 2];

        const gl = this.renderer.gl;

        // Generate our world model
        this.worldModel = this.generateWorldModel([
            { frequency: 8, amplitude: 30 },
            { frequency: 16, amplitude: 15 },
        ]);

        // Generate the VAO from our vertices and indices
        this.model = this.renderer.createModel(this.worldModel);

        // Load the world texture
        this.renderer.loadTexture('./images/grass.png', {
            mip: true,
            min: gl.NEAREST_MIPMAP_LINEAR,
            mag: gl.NEAREST
        }, (texture) => {
            this.texture = texture;
        });

        // After everything is initialized, recalculate transformation matrix
        this.recalculateTransformationMatrix();
    }

    recalculateTransformationMatrix() {
        // Calculate the transformation matrix based on world position, scale and rotation
        mat4.identity(this.transform);
        mat4.fromTranslation(this.transform, this.translation);
        mat4.rotateX(this.transform, this.transform, this.rotation[0]);
        mat4.rotateY(this.transform, this.transform, this.rotation[1]);
        mat4.rotateZ(this.transform, this.transform, this.rotation[2]);
        mat4.scale(this.transform, this.transform, this.scale);
    }

    generateWorldModel(perlin) {
        // Use the Perlin noise to generate our terrain this.TERRAIN_SIZE triangle divisions
        return Models.createFloorModel(this.TERRAIN_SIZE, this.TERRAIN_SIZE, perlin);
    }

    pointLiesInside(x, z) {
        let halfWidth = (this.TERRAIN_SIZE * this.scale[0]) / 2;
        let halfHeight = (this.TERRAIN_SIZE * this.scale[2]) / 2;
        return x >= -halfWidth && x <= halfWidth && z >= -halfHeight && z <= halfHeight;
    }
    
    getWorldHeightAtWorldCoordinates(x, z) {
        let u = 0.5 + x / (this.TERRAIN_SIZE * this.scale[0]);
        let v = 0.5 + z / (this.TERRAIN_SIZE * this.scale[2]);
        return this.getWorldHeightAtCoordinates(u, v);
    }

    getWorldHeightAtCoordinates(u, v) {
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1)
            return this.worldModel.generator.calculateWorldHeightAt(u, v) * this.scale[1];
        return Infinity;
    }

}