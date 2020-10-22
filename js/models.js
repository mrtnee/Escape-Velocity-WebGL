const vec3 = glMatrix.vec3;

function createGrid(rows, columns, fn) {
    let array = new Array(rows);
    for (let i = 0; i < array.length; i++) {
        array[i] = new Array(columns);
        for (let j = 0; j < array[i].length; j++) {
            array[i][j] = fn(i, j);
        }
    }
    return array;
}

function linearInterpolate(a0, a1, weight) {
    return (1 - weight) * a0 + weight * a1;
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function dotGridGradient(grid, ix, iy, x, y) {
    let dx = x - ix;
    let dy = y - iy;
    return (dx * grid[iy][ix][0] + dy * grid[iy][ix][1]);
}

function perlinNoise(grid, x, y) {
    let x0 = Math.floor(x);
    let x1 = x0 + 1;
    let y0 = Math.floor(y);
    let y1 = y0 + 1;

    // Weights for x and y
    let sx = x - x0;
    let sy = y - y0;

    var u = fade(sx);
    var v = fade(sy);
    
    let n0 = dotGridGradient(grid, x0, y0, x, y);
    let n1 = dotGridGradient(grid, x1, y0, x, y);
    let ix0 = linearInterpolate(n0, n1, u);

    n0 = dotGridGradient(grid, x0, y1, x, y);
    n1 = dotGridGradient(grid, x1, y1, x, y);
    let ix1 = linearInterpolate(n0, n1, u);

    return linearInterpolate(ix0, ix1, v);
}

function toVec3(array) {
    return vec3.fromValues(array[0], array[1], array[2]);
}

function calculateNormal(vertices, triangle) {
    // Get all three vertices from vertex array and convert them to vec3
    let vertexA = toVec3(vertices[triangle[0]]);
    let vertexB = toVec3(vertices[triangle[1]]);
    let vertexC = toVec3(vertices[triangle[2]]);

    // Calculate the vectors from vertex A to B and from vertex A to C
    let AB = vec3.create();
    let AC = vec3.create();
    vec3.sub(AB, vertexB, vertexA);
    vec3.sub(AC, vertexC, vertexA);

    // To calculate normal, calculate cross product of vectors AB and AC
    let normal = vec3.create();
    vec3.cross(normal, AB, AC);
    vec3.normalize(normal, normal);
    return normal;
}

class PerlinNoiseGenerator {

    constructor(perlin) {
        this.perlin = perlin;

        // Generate perlin gradients
        for (let i = 0; i < this.perlin.length; i++) {
            this.perlin[i].grid = createGrid(this.perlin[i].frequency, this.perlin[i].frequency, function(i, j) {
                return [Math.cos(Math.random() * 2 * Math.PI), Math.sin(Math.random() * 2 * Math.PI)];
            });
        }

    }

    calculateWorldHeightAt(u, v) {
        let y = 0;
        for (let i = 0; i < this.perlin.length; i++) {
            let gradient = this.perlin[i].grid;
            y += perlinNoise(gradient, u * (gradient.length - 2), v * (gradient.length - 2)) * this.perlin[i].amplitude;
        }
        return y;
    }

}

function parseFace(vertices, normal, textureCoordinates, triangle) {
    return [
        vertices[triangle[0]].concat([normal[0], normal[1], normal[2]]).concat(textureCoordinates[triangle[0]]),
        vertices[triangle[1]].concat([normal[0], normal[1], normal[2]]).concat(textureCoordinates[triangle[1]]),
        vertices[triangle[2]].concat([normal[0], normal[1], normal[2]]).concat(textureCoordinates[triangle[2]]),
    ];
}

// The perlin is an array of object { frequency: 8, amplitude: 10 }, where frequency is the size of the grid
// which will be generated and amplitude is an amplitude which will be added to previous values
function createFloorModel(width, height, perlin) {

    let vertices = [];
    let normals = [];
    let textureCoordinates = [];

    let generator = new PerlinNoiseGenerator(perlin);

    for (let j = 0; j <= height; j++) {
        for (let i = 0; i <= width; i++) {
            const x = i - width / 2;
            const z = j - height / 2;

            // Use multiple perlin grids and add them together to get better result
            const y = generator.calculateWorldHeightAt(i / width, j / height);

            // Push vertex, normal and texture coordinates into separate arrays
            vertices.push([x, y, z]);
            normals.push([0, 1, 0]);
            textureCoordinates.push([x, z]);
        }
    }

    let triangles = [];
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            // Create two triangles for each square in our grid
            let firstTriangle = [i + j * (width + 1), i + (j + 1) * (width + 1), (i + 1) + j * (width + 1)];
            let secondTriangle = [(i + 1) + j * (width + 1), i + (j + 1) * (width + 1), (i + 1) + (j + 1) * (width + 1)];

            // Calculate the normal for both triangles
            let firstTriangleNormal = calculateNormal(vertices, firstTriangle);
            let secondTriangleNormal = calculateNormal(vertices, secondTriangle);

            let t1 = parseFace(vertices, firstTriangleNormal, textureCoordinates, firstTriangle);
            let t2 = parseFace(vertices, secondTriangleNormal, textureCoordinates, secondTriangle);
            triangles.push(t1);
            triangles.push(t2);
        }
    }

    let vertexData = [];
    let indices = [];
    // Iterate over triangles
    for (let i = 0; i < triangles.length; i++) {
        // Iterate over all three vertices in triangle
        for (let j = 0; j < 3; j++) {
            // Iterate over all 8 values needed to define a vertex
            for (let k = 0; k < 8; k++) {
                vertexData.push(triangles[i][j][k]);
            }
        }

        // Connect added vertices
        let index = i * 3;
        indices.push(index, index + 1, index + 2);
        //indices.push(index + 3, index + 4, index + 5);
    }

    vertices = new Float32Array(vertexData);
    indices = new Uint16Array(indices);

    return { vertices, indices, generator };
}

export { createFloorModel };