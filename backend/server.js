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

/* PERFIL DE AUTOR Y PORTAFOLIOS PREMIUM */

function verificarPremium(id_usuario, callback) {
    const sql = `
        SELECT *
        FROM suscripciones
        WHERE id_usuario = ? AND estado = 'Activa' AND plan = 'Premium'
    `;

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error || resultados.length === 0) {
            return callback(false);
        }

        callback(true);
    });
}

/* CREAR O ACTUALIZAR PERFIL DE AUTOR */

app.post("/crearPerfilAutor", upload.fields([
    { name: "foto_autor", maxCount: 1 },
    { name: "banner_autor", maxCount: 1 }
]), (req, res) => {
    const { id_usuario, nombre_autor, categoria, rol, descripcion } = req.body;

    verificarPremium(id_usuario, (esPremium) => {
        if (!esPremium) {
            return res.json({
                ok: false,
                mensaje: "Solo los usuarios Premium pueden crear un perfil de autor"
            });
        }

        const fotoAutor = req.files["foto_autor"]
            ? "img/perfiles/" + req.files["foto_autor"][0].filename
            : null;

        const bannerAutor = req.files["banner_autor"]
            ? "img/perfiles/" + req.files["banner_autor"][0].filename
            : null;

        const buscarSql = "SELECT * FROM perfil_autor WHERE id_usuario = ?";

        conexion.query(buscarSql, [id_usuario], (error, resultados) => {
            if (error) {
                console.log(error);
                return res.json({
                    ok: false,
                    mensaje: "Error al buscar perfil de autor"
                });
            }

            if (resultados.length > 0) {
                const sqlUpdate = `
                    UPDATE perfil_autor
                    SET nombre_autor = ?,
                        categoria = ?,
                        rol = ?,
                        descripcion = ?,
                        foto_autor = COALESCE(?, foto_autor),
                        banner_autor = COALESCE(?, banner_autor)
                    WHERE id_usuario = ?
                `;

                conexion.query(
                    sqlUpdate,
                    [nombre_autor, categoria, rol, descripcion, fotoAutor, bannerAutor, id_usuario],
                    (error) => {
                        if (error) {
                            console.log(error);
                            return res.json({
                                ok: false,
                                mensaje: "Error al actualizar perfil de autor"
                            });
                        }

                        res.json({
                            ok: true,
                            mensaje: "Perfil de autor actualizado correctamente"
                        });
                    }
                );
            } else {
                const sqlInsert = `
                    INSERT INTO perfil_autor
                    (id_usuario, nombre_autor, categoria, rol, descripcion, foto_autor, banner_autor)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                conexion.query(
                    sqlInsert,
                    [id_usuario, nombre_autor, categoria, rol, descripcion, fotoAutor, bannerAutor],
                    (error) => {
                        if (error) {
                            console.log(error);
                            return res.json({
                                ok: false,
                                mensaje: "Error al crear perfil de autor"
                            });
                        }

                        res.json({
                            ok: true,
                            mensaje: "Perfil de autor creado correctamente"
                        });
                    }
                );
            }
        });
    });
});

/* OBTENER PERFIL DE AUTOR POR USUARIO */

app.get("/perfilAutor/:id", (req, res) => {
    const id_usuario = req.params.id;

    const sql = "SELECT * FROM perfil_autor WHERE id_usuario = ?";

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener perfil de autor"
            });
        }

        if (resultados.length === 0) {
            return res.json({
                ok: true,
                autor: null
            });
        }

        res.json({
            ok: true,
            autor: resultados[0]
        });
    });
});

/* SUBIR PORTAFOLIO */

app.post("/subirPortafolio", upload.single("imagen"), (req, res) => {
    const { id_usuario, titulo, descripcion } = req.body;

    verificarPremium(id_usuario, (esPremium) => {
        if (!esPremium) {
            return res.json({
                ok: false,
                mensaje: "Solo los usuarios Premium pueden subir portafolios"
            });
        }

        if (!req.file) {
            return res.json({
                ok: false,
                mensaje: "Debes seleccionar una imagen"
            });
        }

        const buscarAutor = "SELECT * FROM perfil_autor WHERE id_usuario = ?";

        conexion.query(buscarAutor, [id_usuario], (error, resultados) => {
            if (error || resultados.length === 0) {
                return res.json({
                    ok: false,
                    mensaje: "Primero debes crear tu perfil de autor"
                });
            }

            const id_autor = resultados[0].id_autor;
            const imagen = "img/perfiles/" + req.file.filename;

            const sql = `
                INSERT INTO portafolios (id_autor, titulo, descripcion, imagen)
                VALUES (?, ?, ?, ?)
            `;

            conexion.query(sql, [id_autor, titulo, descripcion, imagen], (error) => {
                if (error) {
                    console.log(error);
                    return res.json({
                        ok: false,
                        mensaje: "Error al subir portafolio"
                    });
                }

                res.json({
                    ok: true,
                    mensaje: "Portafolio publicado correctamente"
                });
            });
        });
    });
});

/* MIS PORTAFOLIOS */

app.get("/misPortafolios/:id", (req, res) => {
    const id_usuario = req.params.id;

    const sql = `
        SELECT p.*
        FROM portafolios p
        INNER JOIN perfil_autor a ON p.id_autor = a.id_autor
        WHERE a.id_usuario = ?
        ORDER BY p.fecha_publicacion DESC
    `;

    conexion.query(sql, [id_usuario], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener portafolios"
            });
        }

        res.json({
            ok: true,
            portafolios: resultados
        });
    });
});

/* TODOS LOS PORTAFOLIOS PARA EXPLORAR */

app.get("/portafolios", (req, res) => {
    const sql = `
        SELECT 
            p.id_portafolio,
            p.titulo,
            p.descripcion,
            p.imagen,
            p.fecha_publicacion,
            a.nombre_autor,
            a.categoria,
            a.rol,
            a.foto_autor
        FROM portafolios p
        INNER JOIN perfil_autor a ON p.id_autor = a.id_autor
        ORDER BY p.fecha_publicacion DESC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener portafolios"
            });
        }

        res.json({
            ok: true,
            portafolios: resultados
        });
    });
});

/* AUTORES POR CATEGORÍA */

app.get("/autores/:categoria", (req, res) => {
    const categoria = req.params.categoria;

    const sql = `
        SELECT *
        FROM perfil_autor
        WHERE categoria = ?
        ORDER BY fecha_creacion DESC
    `;

    conexion.query(sql, [categoria], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener autores"
            });
        }

        res.json({
            ok: true,
            autores: resultados
        });
    });
});

/* OBTENER AUTOR POR ID */

app.get("/autor/:id_autor", (req, res) => {
    const id_autor = req.params.id_autor;

    const sql = "SELECT * FROM perfil_autor WHERE id_autor = ?";

    conexion.query(sql, [id_autor], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener autor"
            });
        }

        if (resultados.length === 0) {
            return res.json({
                ok: true,
                autor: null
            });
        }

        res.json({
            ok: true,
            autor: resultados[0]
        });
    });
});

/* OBTENER PORTAFOLIOS POR AUTOR */

app.get("/portafoliosAutor/:id_autor", (req, res) => {
    const id_autor = req.params.id_autor;

    const sql = `
        SELECT *
        FROM portafolios
        WHERE id_autor = ?
        ORDER BY fecha_publicacion DESC
    `;

    conexion.query(sql, [id_autor], (error, resultados) => {
        if (error) {
            console.log(error);
            return res.json({
                ok: false,
                mensaje: "Error al obtener portafolios del autor"
            });
        }

        res.json({
            ok: true,
            portafolios: resultados
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