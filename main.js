async function main() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    const vertexShaderCode = document.getElementById("vertexShaderCode").text;
    const fragmentShaderCode =
        document.getElementById("fragmentShaderCode").text;

    // compiles and links the shaders, looks up attribute and uniform locations
    const meshProgramInfo = webglUtils.createProgramInfo(gl, [
        vertexShaderCode,
        fragmentShaderCode,
    ]);

    const response = await fetch(
        "https://cdn.jsdelivr.net/gh/theresianwg/Tugas-WebGL-Almari/almari.obj"
    );
    const text = await response.text();
    const obj = parseOBJ(text);

    const parts = obj.geometries.map(({ data }) => {
        if (data.color) {
            if (data.position.length === data.color.length) {
                data.color = { numComponents: 4, data: data.color };
            }
        } else {
            data.color = { value: [1, 1, 1, 1] };
        }

        const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
        return {
            material: {
                u_diffuse: [0.85, 0.6, 0.35, 1],
            },
            bufferInfo,
        };
    });

    const extents = getGeometriesExtents(obj.geometries);
    const range = m4.subtractVectors(extents.max, extents.min);
    const objOffset = m4.scaleVector(
        m4.addVectors(extents.min, m4.scaleVector(range, 0.5)),
        -1
    );
    const cameraTarget = [0, 0, 0];
    const radius = m4.length(range) * 0.9;
    const cameraPosition = m4.addVectors(cameraTarget, [2, 2, radius]);
    const zNear = radius / 100;
    const zFar = radius * 3;

    function render(time) {
        time *= 0.001; 

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        const fieldOfViewRadians = degToRad(55);
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projection = m4.perspective(
            fieldOfViewRadians,
            aspect,
            zNear,
            zFar
        );

        const up = [0, 1, 0];
        const camera = m4.lookAt(cameraPosition, cameraTarget, up);

        const view = m4.inverse(camera);

        const sharedUniforms = {
            u_lightDirection: m4.normalize([-1, 3, 5]),
            u_view: view,
            u_projection: projection,
        };

        gl.useProgram(meshProgramInfo.program);

        webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

        let u_world = m4.yRotation(time);
        u_world = m4.translate(u_world, ...objOffset);

        for (const { bufferInfo, material } of parts) {
            webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
            webglUtils.setUniforms(meshProgramInfo, {
                u_world,
                u_diffuse: material.u_diffuse,
            });
            
            webglUtils.drawBufferInfo(gl, bufferInfo);
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();