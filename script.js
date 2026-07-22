// Número do pedido
let orderNumber = 1;

// Campos
const food = document.getElementById("food");
const quantity = document.getElementById("quantity");
const table = document.getElementById("table");
const customer = document.getElementById("customer");
const notes = document.getElementById("notes");

// Preview
const previewFood = document.getElementById("previewFood");
const previewQuantity = document.getElementById("previewQuantity");
const previewTable = document.getElementById("previewTable");
const previewCustomer = document.getElementById("previewCustomer");
const previewNotes = document.getElementById("previewNotes");
const previewHour = document.getElementById("previewHour");
const previewNumber = document.getElementById("previewNumber");

// Botões
const printButton = document.getElementById("print");
const newButton = document.getElementById("newOrder");

// Atualiza relógio
function updateHour() {

    const now = new Date();

    previewHour.textContent = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });

}

setInterval(updateHour, 1000);
updateHour();

// Atualiza preview
function updatePreview() {

    previewFood.textContent =
        food.value.trim() || "Aguardando pedido";

    previewQuantity.textContent =
        `${quantity.value || 1}x`;

    previewTable.textContent =
        table.value || "--";

    previewCustomer.textContent =
        customer.value.trim() || "—";

    previewNotes.textContent =
        notes.value.trim() || "Nenhuma observação";

}

// Eventos
food.addEventListener("input", updatePreview);
quantity.addEventListener("input", updatePreview);
table.addEventListener("input", updatePreview);
customer.addEventListener("input", updatePreview);
notes.addEventListener("input", updatePreview);

updatePreview();

// Novo Pedido
newButton.addEventListener("click", () => {

    food.value = "";
    quantity.value = 1;
    table.value = "";
    customer.value = "";
    notes.value = "";

    orderNumber++;

    previewNumber.textContent =
        String(orderNumber).padStart(4, "0");

    updatePreview();

    food.focus();

});

// Imprimir
printButton.addEventListener("click", () => {

    if (!food.value.trim()) {

        alert("Informe o nome da comida.");

        food.focus();

        return;

    }

    if (!table.value.trim()) {

        alert("Informe a mesa.");

        table.focus();

        return;

    }

    updateHour();

    window.print();

});

// Atalhos
document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        newButton.click();

    }

    if (event.ctrlKey && event.key.toLowerCase() === "p") {

        event.preventDefault();

        printButton.click();

    }

});