console.log("ESTE ES EL SERVER.JS CORRECTO");

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));

app.use("/img", express.static(path.join(__dirname, "../img")));
app.use("/Img", express.static(path.join(__dirname, "../Img")));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../img/perfiles"));
    },
    filename: (req, file, cb) => {
        const nombreUnico = Date.now() + path.extname(file.originalname);
        cb(null, nombreUnico);
    }
});

const upload = multer({ storage });

const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "innovance"
});

conexion.connect((error) => {
    if (error) {
        console.log("Error al conectar a MySQL:", error);
        return;
    }

    console.log("Conectado a MySQL correctamente");
});

/* REGISTRO */

app.post("/registro", async (req, res) => {
    const { nombre, correo, contrasena } = req.body;

    try {
        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

        const sql = "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)";

        conexion.query(sql, [nombre, correo, contrasenaEncriptada], (error) => {
            if (error) {
                console.log(error);
                return res.json({
                    ok: false,
                    mensaje: "Error al registrar usuario"
                });
            }

            res.json({
                ok: true,
                mensaje: "Usuario registrado correctamente"
            });
        });
    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            mensaje: "Error interno al registrar usuario"
        });
    }
});

/* LOGIN */

app.post("/login", (req, res) => {
    const { correo, contrasena } = req.body;

    const sql = "SELECT * FROM usuarios WHERE correo = ?";

    conexion.query(sql, [correo], async (error, resultados) => {
        if (error || resultados.length === 0) {
            return res.json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const usuario = resultados[0];
        const correcta = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!correcta) {
            return res.json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        res.json({
            ok: true,
            mensaje: "Inicio de sesión correcto",
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo
        });
    });
});

/* GUARDAR PERFIL */

app.post("/guardarPerfil", (req, res) => {
    const { id_usuario, profesion, biografia } = req.body;

    const sql = `
        INSERT INTO perfil_usuario (id_usuario, profesion, biografia)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            profesion = VALUES(profesion),
            biografia = VALUES(biografia)
    `;

    conexion.query(sql, [id_usuario, profesion, biografia], (error) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al guardar el perfil"
            });
        }

        res.json({
            ok: true,
            mensaje: "Perfil guardado correctamente"
        });
    });
});

/* SUBIR FOTO */

app.post("/subirFoto", upload.single("foto"), (req, res) => {
    const id_usuario = req.body.id_usuario;

    if (!req.file) {
        return res.json({
            ok: false,
            mensaje: "No se seleccionó ninguna imagen"
        });
    }

    const rutaFoto = "img/perfiles/" + req.file.filename;

    const sql = `
        INSERT INTO perfil_usuario (id_usuario, foto_perfil)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
            foto_perfil = VALUES(foto_perfil)
    `;

    conexion.query(sql, [id_usuario, rutaFoto], (error) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al guardar la foto"
            });
        }

        res.json({
            ok: true,
            mensaje: "Foto actualizada correctamente",
            ruta: rutaFoto
        });
    });
});

/* OBTENER PERFIL */

app.get("/perfil/:id", (req, res) => {
    const id_usuario = req.params.id;

    const sql = "SELECT * FROM perfil_usuario WHERE id_usuario = ?";

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener el perfil"
            });
        }

        if (resultados.length === 0) {
            return res.json({
                ok: true,
                perfil: null
            });
        }

        res.json({
            ok: true,
            perfil: resultados[0]
        });
    });
});

/* SUSCRIPCIONES */

app.post("/suscribirse", (req, res) => {
    const { id_usuario, plan, precio } = req.body;

    const sql = `
        INSERT INTO suscripciones (id_usuario, plan, precio)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            plan = VALUES(plan),
            precio = VALUES(precio),
            estado = 'Activa',
            fecha_inicio = CURRENT_TIMESTAMP
    `;

    conexion.query(sql, [id_usuario, plan, precio], (error) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al guardar la suscripción"
            });
        }

        res.json({
            ok: true,
            mensaje: "Suscripción realizada correctamente"
        });
    });
});

app.get("/suscripcion/:id", (req, res) => {
    const id_usuario = req.params.id;

    const sql = "SELECT * FROM suscripciones WHERE id_usuario = ?";

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error) {
            return res.json({
                ok: false,
                mensaje: "Error al obtener suscripción"
            });
        }

        if (resultados.length === 0) {
            return res.json({
                ok: true,
                suscripcion: null
            });
        }

        res.json({
            ok: true,
            suscripcion: resultados[0]
        });
    });
});

app.post("/cambiarSuscripcion", (req, res) => {
    const { id_usuario, plan, precio } = req.body;

    const sql = `
        UPDATE suscripciones
        SET plan = ?, precio = ?, estado = 'Activa', fecha_inicio = CURRENT_TIMESTAMP
        WHERE id_usuario = ?
    `;

    conexion.query(sql, [plan, precio, id_usuario], (error) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al cambiar la suscripción"
            });
        }

        res.json({
            ok: true,
            mensaje: "Suscripción actualizada correctamente"
        });
    });
});

app.post("/cancelarSuscripcion", (req, res) => {
    const { id_usuario } = req.body;

    const sql = `
        UPDATE suscripciones
        SET estado = 'Cancelada'
        WHERE id_usuario = ?
    `;

    conexion.query(sql, [id_usuario], (error) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al cancelar la suscripción"
            });
        }

        res.json({
            ok: true,
            mensaje: "Suscripción cancelada correctamente"
        });
    });
});

/* FAVORITOS */

app.post("/favoritos", (req, res) => {
    const { id_usuario, titulo, categoria, imagen, tipo } = req.body;

    const sql = `
        INSERT INTO favoritos (id_usuario, titulo, categoria, imagen, tipo)
        VALUES (?, ?, ?, ?, ?)
    `;

    conexion.query(
        sql,
        [id_usuario, titulo, categoria, imagen, tipo || "portafolio"],
        (error) => {
            if (error) {
                console.log(error);
                return res.json({
                    ok: false,
                    mensaje: "Error al guardar favorito"
                });
            }

            res.json({
                ok: true,
                mensaje: "Agregado a favoritos"
            });
        }
    );
});

app.get("/favoritos/:id", (req, res) => {
    const id_usuario = req.params.id;

    const sql = `
        SELECT *
        FROM favoritos
        WHERE id_usuario = ?
        ORDER BY fecha_guardado DESC
    `;

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener favoritos"
            });
        }

        res.json({
            ok: true,
            favoritos: resultados
        });
    });
});

/* RUTA PRINCIPAL */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});