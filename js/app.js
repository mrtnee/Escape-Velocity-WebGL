import Application from './lib/Application.js';
import ObjLoader from './objLoader.js';
import { KeyboardController, MouseController, leftKeyboardRemapper, rightKeyboardRemapper } from './input.js';
import Camera from './camera.js';
import Node from './node.js';
import Renderer from './renderer.js';
import KinematicBody from './kinematicBody.js';
import Checkpoint from './checkpoint.js';
import { boxesCollide } from './physics.js';
import World from './world.js';
import DocumentUpdater from './documentUpdater.js';

// Define constants for easier access to glMatrix objects
const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const quat = glMatrix.quat;

var elapsedTime = 0;
var frameCount = 0;
var lastTime = new Date().getTime();

class App extends Application {

    start() {
        // Generate NUMBER_OF_CHECKPOINTS checkpoints above the terrain
        this.NUMBER_OF_CHECKPOINTS = 8;
        // This factor tells how far from center the checkpoints will be (0 means in the center, 1 at the edge)
        this.CHECKPOINT_RADIUS_FACTOR = 0.8;
        // How much units the checkpoint should be above the ground
        this.CHECKPOINT_ABOVE_GROUND = 10;

        // Maximum game duration in seconds
        this.GAME_DURATION = 2 * 60;

        // How much time the player has to wait when they die
        this.DEATH_TIMEOUT = 3;

        // Current player scores (in checkpoints marked)
        this.playerScores = {
            firstPlayer: 0,
            secondPlayer: 0
        };

        // Whether or not the game has started
        this.gameStarted = false;

        const gl = this.gl;

        // Create a controller for keyboard and mouse events
        this.keyboardController = new KeyboardController(window);
        this.mouseController = new MouseController(this.canvas);

        // Create a new renderer object and pass it our gl object
        this.renderer = new Renderer(this.gl);

        // Create root node, each other element must be a child of this node
        this.root = new Node();

        // The intro camera that is showing before user presses anything
        this.introCamera = new Camera(vec3.fromValues(0, 2, 0));

        // We will be rendering split screen, so we need two different cameras
        // The first camera constructor is the translation of the camera, the second is the rotation
        this.firstSpaceshipCamera = new Camera(vec3.fromValues(0, 2, -16), vec3.fromValues(0, 0, 0));
        this.secondSpaceshipCamera = new Camera(vec3.fromValues(0, 2, -16), vec3.fromValues(0, 0, 0));
        this.root.addChild(this.firstSpaceshipCamera);
        this.root.addChild(this.secondSpaceshipCamera);

        this.initializeWorld();
        this.initializeSpaceships();
        this.initializeCheckpoints();

        this.firstSpaceshipCamera.spaceship = this.firstSpaceship;
        this.secondSpaceshipCamera.spaceship = this.secondSpaceship;

        // Create a directional light - sun
        this.sun = {
            direction: [0.3, -1, 0.1],
            ambient: 0.6,
            color: [255, 255, 255],
        }

        // Create a skybox
        this.skybox = new Node();
        ObjLoader.load('models/skybox.obj', function (obj) {
            let skyboxModel = this.renderer.createModel(obj);
            this.skybox.model = skyboxModel;
            let size = [4000, -4000, 4000];
            mat4.fromScaling(this.skybox.transform, size);
            this.renderer.loadTexture('./images/skybox.jpg', {
                mip: true,
                min: gl.NEAREST_MIPMAP_LINEAR,
                mag: gl.NEAREST
            }, (texture) => {
                this.skybox.texture = texture;
            });
        }.bind(this));

        // Create lasers
        this.laserOne = new Node();
        this.laserTwo = new Node();
        ObjLoader.load('models/laser.obj', function (obj) {
            let laserModel = this.renderer.createModel(obj);
            this.laserOne.model = laserModel;
            this.laserTwo.model = laserModel;
            this.laserTwo.texture = this.secondSpaceship.texture;
            this.laserOne.texture = this.firstSpaceship.texture;
            let size = [0.75, 0.75, 10000];
            mat4.fromScaling(this.laserOne.transform, size);
            mat4.translate(this.laserOne.transform, this.laserOne.transform, vec3.fromValues(0, 0.9, 0));
            mat4.rotateY(this.laserOne.transform, this.laserOne.transform, Math.PI);
            mat4.fromScaling(this.laserTwo.transform, size);
            mat4.translate(this.laserTwo.transform, this.laserTwo.transform, vec3.fromValues(0, 0.9, 0));
            mat4.rotateY(this.laserTwo.transform, this.laserTwo.transform, Math.PI);
        }.bind(this));
        this.firstSpaceship.addChild(this.laserOne);
        this.secondSpaceship.addChild(this.laserTwo);
        this.firstSpaceship.laser = this.laserOne;
        this.secondSpaceship.laser = this.laserTwo;

        // Initial time for our update function
        this.time = Date.now();
        this.startTime = this.time;

        // Create a new document updater, that will update our HTML elements
        this.documentUpdater = new DocumentUpdater(this);

        // When the app is initialised, use the renderIntroCamera, then switch to renderGame
        this.render = this.renderIntroCamera;

    }

    beforeStart() {
        this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        // Set the rendering and updating function
        this.render = this.renderGame;
        this.update = this.updateBeforeStart;

        // Move the spaceships to their positions
        this.firstSpaceship.update(dt);
        this.secondSpaceship.update(dt);

        // Mark both cameras as grayscale
        this.firstSpaceshipCamera.grayscale = true;
        this.secondSpaceshipCamera.grayscale = true;
    }

    updateBeforeStart() {
        // The update function before start of the game just updates checkpoints and moves cameras
        this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        // First update and move the checkpoints, otherwise the collision detection does not work
        this.checkpoints.children.forEach(function (child) {
            child.update(dt);
        });

        this.firstSpaceshipCamera.update(dt);
        this.secondSpaceshipCamera.update(dt);
    }

    startGame() {
        this.firstSpaceshipCamera.grayscale = false;
        this.secondSpaceshipCamera.grayscale = false;
        this.gameStarted = true;
        this.update = this.updateGame;
    }

    endGame() {
        this.gameStarted = false;
        this.render = this.renderIntroCamera;
    }

    initializeSpaceships() {
        const gl = this.gl;

        // Load the first spaceship model and set it as model for firstSpaceship
        ObjLoader.load('models/spaceship1.obj', function (obj) {
            let spaceshipModel = this.renderer.createModel(obj);
            this.firstSpaceship.model = spaceshipModel;
        }.bind(this));

        // Load the second spaceship model and set it as model for secondSpaceship
        ObjLoader.load('models/spaceship2.obj', function (obj) {
            let spaceshipModel = this.renderer.createModel(obj);
            this.secondSpaceship.model = spaceshipModel;
        }.bind(this));

        // Create both spaceships and add them to app, each spaceship must have a different keyboard remapper
        this.firstSpaceship = new KinematicBody(this.keyboardController, leftKeyboardRemapper, vec3.fromValues(249, 160, 27), gl);
        this.secondSpaceship = new KinematicBody(this.keyboardController, rightKeyboardRemapper, vec3.fromValues(0, 174, 239), gl);

        // Randomly position both spaceships on top our world
        this.firstSpaceship.translation = this.getRandomPositionAboveWorld(500);
        this.secondSpaceship.translation = this.getRandomPositionAboveWorld(500);

        // Add both spaceships to our root node
        this.root.addChild(this.firstSpaceship);
        this.root.addChild(this.secondSpaceship);

        // make references between spaceships
        this.firstSpaceship.opponent = this.secondSpaceship;
        this.secondSpaceship.opponent = this.firstSpaceship;
    }

    getRandomPositionAboveWorld(offset) {
        let u = Math.random();
        let v = Math.random();
        return vec3.fromValues(
            (u - 0.5) * this.world.scale[0] * this.world.TERRAIN_SIZE * this.CHECKPOINT_RADIUS_FACTOR,
            this.world.getWorldHeightAtCoordinates(u, v) + offset,
            (v - 0.5) * this.world.scale[0] * this.world.TERRAIN_SIZE * this.CHECKPOINT_RADIUS_FACTOR,
        );
    }

    initializeWorld() {
        const gl = this.gl;
        // Generate a new world and add it to our main scene
        this.world = new World(this.renderer);
        this.root.addChild(this.world);
    }

    initializeCheckpoints() {
        // Everything that needs to be drawn using holographic shader should be inside this.checkpoints node
        this.checkpoints = new Node();

        // Load the checkpoint model from obj file
        ObjLoader.load('models/checkpoint.obj', function (obj) {
            this.checkpointModel = this.renderer.createModel(obj);
            this.checkpoints.children.forEach(checkpoint => checkpoint.model = this.checkpointModel);
        }.bind(this));

        for (let i = 0; i < this.NUMBER_OF_CHECKPOINTS; i++) {
            // Calculate the x and z position from circle, between [-1, 1]
            let x = Math.cos(i / this.NUMBER_OF_CHECKPOINTS * 2 * Math.PI);
            let z = Math.sin(i / this.NUMBER_OF_CHECKPOINTS * 2 * Math.PI);
            let y = this.world.getWorldHeightAtCoordinates(
                (x * this.CHECKPOINT_RADIUS_FACTOR) / 2 + 0.5,
                (z * this.CHECKPOINT_RADIUS_FACTOR) / 2 + 0.5
            );

            let checkpointPosition = vec3.fromValues(
                x * this.world.scale[0] * this.world.TERRAIN_SIZE * this.CHECKPOINT_RADIUS_FACTOR * 0.5,
                y + this.CHECKPOINT_ABOVE_GROUND * this.world.scale[1],
                z * this.world.scale[2] * this.world.TERRAIN_SIZE * this.CHECKPOINT_RADIUS_FACTOR * 0.5
            );

            // Create new checkpoint, set its position, then add it to checkpoints
            const currentCheckpoint = new Checkpoint();
            currentCheckpoint.position = checkpointPosition;
            this.checkpoints.addChild(currentCheckpoint);
        }
    }

    isCollidingWithWorld(node) {
        let translation = node.translation;

        // Get the world height and check if it is above our node
        let worldHeight = this.world.getWorldHeightAtWorldCoordinates(translation[0], translation[2]);
        if (worldHeight > translation[1])
            return true;

        return false;
    }

    modelsLoaded() {
        return !(!this.firstSpaceship.model || !this.secondSpaceship.model || !this.checkpointModel || !this.skybox.model);
    }

    updateGame() {
        this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        // Don't update anything until the models have been loaded
        if (!this.modelsLoaded())
            return;

        // First update and move the checkpoints, otherwise the collision detection does not work
        this.checkpoints.children.forEach(function (child) {
            child.update(dt);
        });

        // Check if either of our spaceships is colliding with the floor
        if (this.isCollidingWithWorld(this.firstSpaceship)) {
            this.firstSpaceship.speed = this.secondSpaceship.minSpeed;
            this.firstSpaceship.translation = this.getRandomPositionAboveWorld(300);
            this.firstSpaceship.qRotation = quat.fromValues(0, 0, 0, 1);
            this.firstSpaceship.speed = 0;
            this.firstSpaceship.update(dt);
            this.firstSpaceshipCamera.grayscale = true;
            this.firstSpaceship.dead = true;
            this.documentUpdater.startCountdown("countdown-left", this.DEATH_TIMEOUT, function () {
                this.firstSpaceshipCamera.grayscale = false;
                this.firstSpaceship.dead = false;
            }.bind(this));
        }

        if (this.isCollidingWithWorld(this.secondSpaceship)) {
            this.secondSpaceship.speed = this.secondSpaceship.minSpeed;
            this.secondSpaceship.translation = this.getRandomPositionAboveWorld(300);
            this.secondSpaceship.qRotation = quat.fromValues(0, 0, 0, 1);
            this.secondSpaceship.speed = 0;
            this.secondSpaceship.update(dt);
            this.secondSpaceshipCamera.grayscale = true;
            this.secondSpaceship.dead = true;
            this.documentUpdater.startCountdown("countdown-right", this.DEATH_TIMEOUT, function () {
                this.secondSpaceshipCamera.grayscale = false;
                this.secondSpaceship.dead = false;
            }.bind(this));
        }

        // Check if either spaceship is colliding with the checkpoint
        let firstSpaceshipBoundingBox = this.firstSpaceship.boundingBox();
        let secondSpaceshipBoundingBox = this.secondSpaceship.boundingBox();

        for (let i = 0; i < this.checkpoints.children.length; i++) {
            let checkpoint = this.checkpoints.children[i];
            let checkpointBoundingBox = checkpoint.boundingBox();
            if (boxesCollide(checkpointBoundingBox, firstSpaceshipBoundingBox)) {
                checkpoint.spaceshipReference = this.firstSpaceship;
            } else if (boxesCollide(checkpointBoundingBox, secondSpaceshipBoundingBox)) {
                checkpoint.spaceshipReference = this.secondSpaceship;
            }
        }

        // Calculate current score for both players
        this.playerScores.firstPlayer = 0;
        this.playerScores.secondPlayer = 0;
        for (let i = 0; i < this.checkpoints.children.length; i++) {
            if (this.checkpoints.children[i].spaceshipReference == this.firstSpaceship)
                this.playerScores.firstPlayer += 1;
            else if (this.checkpoints.children[i].spaceshipReference == this.secondSpaceship)
                this.playerScores.secondPlayer += 1;
        }

        // Update both spaceships
        this.firstSpaceship.update(dt, this.gameStarted);
        this.secondSpaceship.update(dt, this.gameStarted);

        // // Update both cameras
        this.firstSpaceshipCamera.update(dt);
        this.secondSpaceshipCamera.update(dt);

        this.documentUpdater.update();

    }

    showfps() {
        var now = new Date().getTime();
        frameCount++;
        elapsedTime += (now - lastTime);
        lastTime = now;
        if (elapsedTime >= 1000) {
            console.log('fps: ' + frameCount);
            frameCount = 0;
            elapsedTime -= 1000;
        }
    }

    renderIntroCamera() {
        // Don't update anything until the models have been loaded
        if (!this.modelsLoaded())
            return;

        // Render only one camera that is moving aroung our scene
        let viewport = { x: 0, y: 0, width: this.gl.canvas.width, height: this.gl.canvas.height };
        let currentAngle = (new Date()) / 10000;
        let y = this.world.getWorldHeightAtCoordinates(0.5, 0.5);
        mat4.identity(this.introCamera.transform);
        mat4.translate(this.introCamera.transform, this.introCamera.transform, [0, y + 500, 0]);
        mat4.rotateY(this.introCamera.transform, this.introCamera.transform, currentAngle);
        mat4.rotateX(this.introCamera.transform, this.introCamera.transform, -0.3);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.renderer.renderToViewport(viewport, this.root, this.checkpoints, this.skybox, this.introCamera, this.sun);
    }

    renderGame() {
        // Don't render anything until the models have been loaded
        if (!this.modelsLoaded())
            return;

        this.renderer.render(this.root, this.checkpoints, this.skybox, [this.firstSpaceshipCamera, this.secondSpaceshipCamera], this.sun);
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspect = (w / 2) / h;
        const fovy = Math.PI / 3;
        const near = 0.1;

        let maximumClippingDistance = 40000;
        const far = maximumClippingDistance;

        // Create a perspective projection for both spaceship cameras
        mat4.perspective(this.firstSpaceshipCamera.projection, fovy, aspect, near, far);
        mat4.perspective(this.secondSpaceshipCamera.projection, fovy, aspect, near, far);

        // Also create intro screen camera
        mat4.perspective(this.introCamera.projection, fovy, aspect * 2, near, far);
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('canvas');
    const app = new App(canvas);
});