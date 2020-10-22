import * as WebGL from './lib/WebGL.js';
import shaders from './shaders.js';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

export default class Renderer {

    constructor(gl) {
        this.gl = gl;

        gl.clearColor(0.85, 0.98, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.defaultTexture = WebGL.createTexture(gl, {
            data   : new Uint8Array([0, 0, 0, 255]),
            width  : 1,
            height : 1,
        });

        this.programs = WebGL.buildPrograms(gl, shaders);
    }

    render(scene, checkpoints, skybox, cameras, sun) {
        const gl = this.gl;

        // Clear our scene, but only for all viewports
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        let leftViewport = { x: 0, y: 0, width: gl.canvas.width / 2, height: gl.canvas.height };
        let rightViewport = { x: gl.canvas.width / 2, y: 0, width: gl.canvas.width / 2, height: gl.canvas.height };

        // First render the first spaceship camera
        this.renderToViewport(leftViewport, scene, checkpoints, skybox, cameras[0], sun);

        // Then render the second spaceship camera
        this.renderToViewport(rightViewport, scene, checkpoints, skybox, cameras[1], sun);
    }

    renderToViewport(viewport, scene, checkpoints, skybox, camera, sun) {
        const gl = this.gl;

        // Program for drawing the skybox
        let noShadingProgram = (camera.grayscale) ? this.programs.grayscaleNoShading : this.programs.noShading;
        // Program for drawing everything else
        let worldProgram = (camera.grayscale) ? this.programs.grayscaleLambert : this.programs.lambert;

        // Set the viewport to viewport rectangle (x, y, width, height)
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

        // Calculate the camera projection matrix
        const viewMatrix = camera.getGlobalTransform();
        mat4.invert(viewMatrix, viewMatrix);

        // Before rendering anything, render the skybox, first disable the depth test
        gl.disable(gl.CULL_FACE);
        gl.useProgram(noShadingProgram.program);

        let matrix = mat4.clone(viewMatrix);
        mat4.mul(matrix, matrix, skybox.transform);

        gl.bindVertexArray(skybox.model.vao);
        gl.uniformMatrix4fv(noShadingProgram.uniforms.uViewModel, false, matrix);
        gl.uniformMatrix4fv(noShadingProgram.uniforms.uProjection, false, camera.projection);
        
        const texture = skybox.texture || this.defaultTexture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.drawElements(gl.TRIANGLES, skybox.model.indices, gl.UNSIGNED_SHORT, 0);

        // Reenable the depth test and draw as we did before
        gl.enable(gl.CULL_FACE);
        const program = worldProgram;
        gl.useProgram(program.program);

        matrix = mat4.create();
        let matrixStack = [];

        mat4.copy(matrix, viewMatrix);
        gl.uniformMatrix4fv(program.uniforms.uProjection, false, camera.projection);

        gl.uniform1f(program.uniforms.uAmbient, sun.ambient);
        gl.uniform1f(program.uniforms.uDiffuse, sun.diffuse);
        gl.uniform3fv(program.uniforms.uLightDirection, sun.direction);
        let color = vec3.clone(sun.color);
        vec3.scale(color, color, 1.0 / 255.0);
        gl.uniform3fv(program.uniforms.uLightColor, color);

        scene.traverse(
            (node) => {
                matrixStack.push(mat4.clone(matrix));
                mat4.mul(matrix, matrix, node.transform);
                if (node.model) {
                    gl.bindVertexArray(node.model.vao);
                    gl.uniformMatrix4fv(program.uniforms.uViewModel, false, matrix);
                    const texture = node.texture || this.defaultTexture;
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.drawElements(gl.TRIANGLES, node.model.indices, gl.UNSIGNED_SHORT, 0);
                }
            },
            (node) => {
                matrix = matrixStack.pop();
            }
        );

        // Change program to holographic shader
        const holographicProgram = this.programs.holographic;
        gl.useProgram(holographicProgram.program);

        // Set the holographic program atributes uniforms
        gl.uniformMatrix4fv(holographicProgram.uniforms.uProjection, false, camera.projection);

        checkpoints.traverse(
            (node) => {
                matrixStack.push(mat4.clone(matrix));
                mat4.mul(matrix, matrix, node.transform);
                if (node.model) {
                    gl.bindVertexArray(node.model.vao);

                    // If current checkpoint has a reference to player, color it with their color
                    let color = vec3.fromValues(255, 255, 255);
                    if (node.spaceshipReference != null && node.spaceshipReference.color != null) {
                        color = vec3.clone(node.spaceshipReference.color);
                    }
                    vec3.scale(color, color, 1 / 255);

                    gl.uniform3fv(holographicProgram.uniforms.uColor, color);
                    gl.uniformMatrix4fv(holographicProgram.uniforms.uViewModel, false, matrix);
                    gl.drawElements(gl.TRIANGLES, node.model.indices, gl.UNSIGNED_SHORT, 0);
                }
            },
            (node) => {
                matrix = matrixStack.pop();
            }
        );
    }

    createModel(model) {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

        const indices = model.indices.length;
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);

        if (model.boundingBox != null)
            return { vao, indices, boundingBox: model.boundingBox }

        return { vao, indices };
    }

    loadTexture(url, options, handler) {
        const gl = this.gl;

        let image = new Image();
        image.addEventListener('load', () => {
            const opts = Object.assign({ image }, options);
            handler(WebGL.createTexture(gl, opts));
        });
        image.src = url;
    }

}