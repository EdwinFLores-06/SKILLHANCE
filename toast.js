function mostrarToast(mensaje, tipo = "success") {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = "toast show " + tipo;

    setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}