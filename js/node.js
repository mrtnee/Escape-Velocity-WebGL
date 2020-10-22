const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

export default class Node {

    constructor() {
        this.transform = mat4.create();
        this.children = [];
        this.parent = null;

        this.translation = vec3.create();
        this.rotation = vec3.create();
        this.scale = vec3.fromValues(1, 1, 1);
    }

    getGlobalTransform() {
        if (!this.parent) {
            return mat4.clone(this.transform);
        } else {
            let transform = this.parent.getGlobalTransform();
            return mat4.mul(transform, transform, this.transform);
        }
    }

    addChild(node) {
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node) {
        const index = this.children.indexOf(node);
        if (index >= 0) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    traverse(before, after) {
        before(this);
        for (let child of this.children) {
            child.traverse(before, after);
        }
        after(this);
    }

    boundingBox() {        
        let topLeft = vec3.create();
        let bottomRight = vec3.create();
        vec3.mul(topLeft, this.model.boundingBox.topLeft, this.scale);
        vec3.mul(bottomRight, this.model.boundingBox.bottomRight, this.scale);
        vec3.add(topLeft, topLeft, this.translation);
        vec3.add(bottomRight, bottomRight, this.translation);
        return { topLeft, bottomRight }
    }

}
