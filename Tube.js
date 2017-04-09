/**
 * Created by Steve on 10/16/2016.
 *
 * Stephen Brown
 * CS420
 * Programming Assignment #3
 * Due 10/28/16
 *
 * This javascript file handles most the calculations dealing with the tube and spine
 * from the document. It handles the calculations from sections 2 and 3.
 */

var supertoroid = {
    n : 2,
    m : 2,
    d : 1,

    x : function(u,v){
        return (this.d + Math.cos(v))*Math.pow(Math.abs(Math.cos(v)),(2/this.m-1))*
            Math.cos(u)*Math.pow(Math.abs(Math.cos(u)),(2/this.n-1));
    },

    y : function(u,v){
        return Math.cos(v)*Math.pow(Math.abs(Math.cos(v)),(2/this.m-1))*
            Math.sin(u)*Math.pow(Math.abs(Math.sin(u)),(2/this.n-1));
    },

    z : function(u,v){
        return Math.sin(v)*Math.pow(Math.abs(Math.sin(v)),(2/this.m-1));
    }
};

var tube = {
    // Generate mesh vertices and surface normals (Figure 4, section 3)
    N : 20,
    M : 10,
    m : 2,
    n : 2,

    verts : null,
    normals : null,
    texCoords : null,

    x : function(u,v){
        return (Math.cos(v)*Math.pow(Math.abs(Math.cos(v)),((2/this.m)-1)))*
        (Math.cos(u)*Math.pow(Math.abs(Math.cos(u)),((2/this.n)-1)));
    },

    y : function(u,v){
        return (Math.cos(v)*Math.pow(Math.abs(Math.cos(v)),((2/this.m)-1)))*
        (Math.sin(u)*Math.pow(Math.abs(Math.sin(u)),((2/this.n)-1)));
    },

    z : function(u,v){
        return (Math.sin(v)*Math.pow(Math.abs(Math.sin(v)),((2/this.m)-1)));
    },

    Nx : function(u,v){
        return (Math.cos(v)*Math.pow(Math.abs(Math.cos(v)),2-(2/this.m)-1))*
        (Math.cos(u)*Math.pow(Math.abs(Math.cos(u)),2-(2/this.n)-1));
    },

    Ny : function(u,v){
        return (Math.cos(v)*Math.pow(Math.abs(Math.cos(v)),2-(2/this.m)-1))*
        (Math.sin(u)*Math.pow(Math.abs(Math.sin(u)),2-(2/this.n)-1));
    },

    Nz : function(u,v){
        return (Math.sin(v)*Math.pow(Math.abs(Math.sin(v)),2-(2/this.m)-1));
    },

    createGeometry : function() {

        var N = this.N, M = this.M;
        var numFloats = 3*(N+1)*(M+1);
        var u = -Math.PI;
        var v = -Math.PI/2;
        var du = 2*Math.PI/M;
        var dv = 2*Math.PI/N;
        if (!this.verts || this.verts.length != numFloats) {
            this.verts = new Float32Array(numFloats);
            this.normals = new Float32Array(numFloats);
            this.texCoords = new Float32Array(2*(N+1)*(M+1));
        }
        var n = 0; // verts & normals index
        // var m = 0; // tex coords index

        for (var i = 0; i <= N; i++, v += dv) {
            //v = (i === N) ? (-Math.PI/2) : i*dv; // handle wrap around
            if (i === N) v = -Math.PI/2;


            for (var j = 0; j <= M; j++, u += du, n += 3) {
                //u = (j === M) ? (-Math.PI) : j*du; // handle wrap around
                if (j === M) u = -Math.PI;

                this.verts[n] = this.x(u, v);
                this.verts[n + 1] = this.y(u, v);
                this.verts[n + 2] = this.z(u, v);

                this.normals[n] = this.Nx(u, v);
                this.normals[n + 1] = this.Ny(u, v);
                this.normals[n + 2] = this.Nz(u, v);
            }
            u = -Math.PI;
        }
    },

    // Generate N triangle strip which are joined into a single strip using
    // degenerate connecting triangles (Figure 7, section 3.1)
    triangleStrip: null,
    createTriangleStrip : function() {
        var M = this.M, N = this.N;
        var numIndices = N*(2*(M+1)+2)-2;
        if (!this.triangleStrip || this.triangleStrip.length != numIndices)
            this.triangleStrip = new Uint16Array(numIndices);
        var index = function(i, j) {
            return i*(M+1) + j;
        };
        var n = 0;
        for (var i = 0; i < N; i++) {
            if (i > 0)  // degenerate connecting index
                this.triangleStrip[n++] = index(i,0);
            for (var j = 0; j <= M; j++) {
                this.triangleStrip[n++] = index(i,j);
                this.triangleStrip[n++] = index(i+1,j);
            }
            if (i < N-1) // degenerate connecting index
                this.triangleStrip[n++] = index(i+1,M)
        }
    },

    wireframe : null, // Uint16Array  (line indices)

    // Function that generates a set of line indices for a wireframe rendering of a mesh
    // defined by a triangle strip (with possible degenerate triangles) (Figure 8, section 3.2)
    createWireFrame : function() {
        var lines = [];
        lines.push(this.triangleStrip[0], this.triangleStrip[1]);
        var numTriangleStripIndices = this.triangleStrip.length;
        for (var i = 2; i < numTriangleStripIndices; i++) {
            var a = this.triangleStrip[i-2];
            var b = this.triangleStrip[i-1];
            var c = this.triangleStrip[i];
            if (a != b && b != c && a != c) // not degenerate triangle
                lines.push(a, c, b, c);
        }
        this.wireframe = new Uint16Array(lines);
    },

    numHedgeHogElements : 0,
    hedgeHog : null,  // Float32Array of lines

    createHedgeHog : function() {
        var lines = [];
        var hedgeHogLength = 0.5*this.r;
        var numNormals = this.normals.length;
        for (var i = 0; i < numNormals; i += 3) {
            var p = [this.verts[i], this.verts[i+1], this.verts[i+2]];
            var n = [this.normals[i], this.normals[i+1], this.normals[i+2]];
            var q = [p[0] + hedgeHogLength*n[0],
                p[1] + hedgeHogLength*n[1],
                p[2] + hedgeHogLength*n[2]];
            lines.push(p[0], p[1], p[2],
                q[0], q[1], q[2]);
        }
        this.numHedgeHogElements = lines.length/3;
        this.hedgeHog = new Float32Array(lines);
    }
};

// Spiral variable that sets and fills the spine (C(t)) with values
var spiral = {

    spine : null, // Where spine = C(t)

    // ... fill spine array with TUBE_N evenly spaced points along curve
    p : 1,
    q : 8,
    a : 3,
    b : 1,
    TUBE_N : 240,

    fillSpine : function() {
        this.spine = new Float32Array(3 * this.TUBE_N);
        var dt = (2 * Math.PI) / this.TUBE_N;
        var t = 0;
        for (var i = 0; i < 3 * this.TUBE_N; i += 3) {
            var temp = this.a + this.b * Math.cos(this.q * t);
            this.spine[i] = temp * Math.cos(this.p * t);
            this.spine[i + 1] = temp * Math.sin(this.p * t);
            this.spine[i + 2] = this.b * Math.sin(this.q * t);
            t += dt;
        }
    }
};

// Draw the lines for the mesh
function drawPolyLines(poly) {
    gl.bindBuffer(gl.ARRAY_BUFFER, poly.vertbuffer);
    gl.enableVertexAttribArray(wireframeProgram.vertexPosition);
    gl.vertexAttribPointer(wireframeProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, poly.wireframeBuffer);
    gl.drawElements(gl.LINES, poly.numLineIndices,
        gl.UNSIGNED_SHORT, 0);
}

// Draw the hedgehog normals
function drawHedgeHog(poly) {
    gl.bindBuffer(gl.ARRAY_BUFFER, poly.hedgeHogBuffer);
    gl.enableVertexAttribArray(wireframeProgram.vertexPosition);
    gl.vertexAttribPointer(wireframeProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, poly.numHedgeHogLineIndices);
}

// Draw the triangle strips
function drawPolyTriangles(poly) {
    gl.bindBuffer(gl.ARRAY_BUFFER, poly.vertbuffer);
    gl.enableVertexAttribArray(shadedProgram.vertexPosition);
    gl.vertexAttribPointer(shadedProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, poly.normbuffer);
    gl.enableVertexAttribArray(shadedProgram.vertexNormal);
    gl.vertexAttribPointer(shadedProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, poly.triangleStripBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, poly.numTriangleStripIndices,
        gl.UNSIGNED_SHORT, 0);
}

// Function for drawing the spine
function drawSpine()
{
    gl.bindBuffer(gl.ARRAY_BUFFER, spineBuffer);
    gl.enableVertexAttribArray(wireframeProgram.vertexPosition);
    gl.vertexAttribPointer(wireframeProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_LOOP, 0, spiral.TUBE_N);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
}

// Gets the tube calculations
function TubeCalculations()
{
    tube.vertbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.vertbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tube.verts, gl.STATIC_DRAW);

    // Need to use normal buffers now for last part of assignment
    var normals = new Float32Array(tube.normals);
    tube.normbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.normbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    tube.hedgeHogBuffer = gl.createBuffer();
    tube.numHedgeHogLineIndices = tube.hedgeHog.length/3;
    gl.bindBuffer(gl.ARRAY_BUFFER, tube.hedgeHogBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tube.hedgeHog, gl.STATIC_DRAW);

    tube.numLineIndices = tube.wireframe.length;
    tube.wireframeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tube.wireframeBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tube.wireframe, gl.STATIC_DRAW);

    tube.triangleStripBuffer = gl.createBuffer();
    tube.numTriangleStripIndices = tube.triangleStrip.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tube.triangleStripBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tube.triangleStrip, gl.STATIC_DRAW);

}
