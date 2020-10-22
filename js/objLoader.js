const vec3 = glMatrix.vec3;

export default class ObjLoader {

    static load(uri, callback) {
        // Fetch the obj data and after it has finished, parse it
        fetch(uri).then(response => response.text().then(function(text) {
            let model = ObjLoader.parse(text);
            callback(model);
        }));
    }

    static parseFace(line, vertices, normals, textureCoordinates) {
        // Convert all three v/vt/vn to numbers
        let firstVertex = line[1].split('/').map(x => parseInt(x));
        let secondVertex = line[2].split('/').map(x => parseInt(x));
        let thirdVertex = line[3].split('/').map(x => parseInt(x));

        let triangle = [
            vertices[firstVertex[0] - 1].concat(normals[firstVertex[2] - 1]).concat(textureCoordinates[firstVertex[1] - 1]),
            vertices[secondVertex[0] - 1].concat(normals[secondVertex[2] - 1]).concat(textureCoordinates[secondVertex[1] - 1]),
            vertices[thirdVertex[0] - 1].concat(normals[thirdVertex[2] - 1]).concat(textureCoordinates[thirdVertex[1] - 1]),
        ];
        return triangle;
    }

    static parse(text) {
        let vertices = [];
        let normals = [];
        let textureCoordinates = [];

        let triangles = [];

        var minX = 10000000, minY = 10000000, minZ = 10000000;
        var maxX = -10000000, maxY = -10000000, maxZ = -10000000;

        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].split(" ");
            switch (line[0]) {
                case "v":
                    let x = parseFloat(line[1]);
                    let y = parseFloat(line[2]);
                    let z = parseFloat(line[3]);
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
                    vertices.push([x, y, z]);
                    break;
                case "vn":
                    normals.push([parseFloat(line[1]), parseFloat(line[2]), parseFloat(line[3])]);
                    break;
                case "vt":
                    textureCoordinates.push([parseFloat(line[1]), parseFloat(line[2])]);
                    break;
                case "f":
                    triangles.push(ObjLoader.parseFace(line, vertices, normals, textureCoordinates));
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
        }

        let boundingBox = {
            topLeft: vec3.fromValues(minX, minY, minZ),
            bottomRight: vec3.fromValues(maxX, maxY, maxZ)
        };

        vertices = new Float32Array(vertexData);
        indices = new Uint16Array(indices);

        return { vertices, indices, boundingBox };
    }

}