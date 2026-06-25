const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");

const login = document.getElementById("login");
const registro = document.getElementById("registro");

btnLogin.addEventListener("click", () => {
    login.classList.remove("oculto");
    registro.classList.add("oculto");

    btnLogin.classList.add("activo");
    btnRegistro.classList.remove("activo");
});

btnRegistro.addEventListener("click", () => {
    registro.classList.remove("oculto");
    login.classList.add("oculto");

    btnRegistro.classList.add("activo");
    btnLogin.classList.remove("activo");
});

const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");

const mensajeLogin = document.getElementById("mensajeLogin");
const mensajeRegistro = document.getElementById("mensajeRegistro");

// REGISTRO
formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = new FormData(formRegistro);

    const nombre = datos.get("nombre");
    const correo = datos.get("correo");
    const contrasena = datos.get("contrasena");
    const confirmar = datos.get("confirmar_contrasena");

    mensajeRegistro.textContent = "";
    mensajeRegistro.className = "";

    if (contrasena !== confirmar) {
        mensajeRegistro.textContent = "Las contraseñas no coinciden";
        mensajeRegistro.className = "mensaje-error";
        return;
    }

    try {
        const respuesta = await fetch("http://localhost:3000/registro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre, correo, contrasena })
        });

        const resultado = await respuesta.json();

        mensajeRegistro.textContent = resultado.mensaje;

        if (resultado.ok) {
            mensajeRegistro.className = "mensaje-exito";

            setTimeout(() => {
                registro.classList.add("oculto");
                login.classList.remove("oculto");

                btnRegistro.classList.remove("activo");
                btnLogin.classList.add("activo");
            }, 1000);
        } else {
            mensajeRegistro.className = "mensaje-error";
        }

    } catch (error) {
        mensajeRegistro.textContent = "No se pudo conectar con el servidor";
        mensajeRegistro.className = "mensaje-error";
    }
});

// LOGIN
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = new FormData(formLogin);

    const correo = datos.get("correo");
    const contrasena = datos.get("contrasena");

    mensajeLogin.textContent = "";
    mensajeLogin.className = "";

    try {
        const respuesta = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const resultado = await respuesta.json();

        mensajeLogin.textContent = resultado.mensaje;

        if (resultado.ok) {
            mensajeLogin.className = "mensaje-exito";

            localStorage.setItem("id_usuario", resultado.id);
            localStorage.setItem("usuario", resultado.nombre);
            localStorage.setItem("correo", resultado.correo);

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } else {
            mensajeLogin.className = "mensaje-error";
        }

    } catch (error) {
        mensajeLogin.textContent = "No se pudo conectar con el servidor";
        mensajeLogin.className = "mensaje-error";
    }
});