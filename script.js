"use strict";

console.log("SCRIPT NUEVO CARGADO");

const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

let supabaseClient = null;
let currentUser = null;


/* ============================================================
   SUPABASE
   ============================================================ */

if (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    window.supabase &&
    typeof window.supabase.createClient === "function"
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}


/* ============================================================
   AÑO
   ============================================================ */

const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}


/* ============================================================
   MODO OSCURO
   ============================================================ */

const themeButton =
    document.getElementById("theme-toggle");

const themeIcon =
    document.querySelector(".theme-icon");

const themeLabel =
    document.querySelector(".theme-label");


function setTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "tronkstudios-theme",
        theme
    );

    if (theme === "dark") {

        if (themeIcon) {
            themeIcon.textContent = "☀️";
        }

        if (themeLabel) {
            themeLabel.textContent = "Claro";
        }

        if (themeButton) {
            themeButton.setAttribute(
                "aria-pressed",
                "true"
            );
        }

    } else {

        if (themeIcon) {
            themeIcon.textContent = "🌙";
        }

        if (themeLabel) {
            themeLabel.textContent = "Oscuro";
        }

        if (themeButton) {
            themeButton.setAttribute(
                "aria-pressed",
                "false"
            );
        }
    }
}


const savedTheme =
    localStorage.getItem(
        "tronkstudios-theme"
    );

if (
    savedTheme === "dark" ||
    savedTheme === "light"
) {

    setTheme(savedTheme);

} else {

    setTheme("light");
}


if (themeButton) {

    themeButton.addEventListener(
        "click",
        function () {

            const current =
                document.documentElement
                    .getAttribute("data-theme");

            setTheme(
                current === "dark"
                    ? "light"
                    : "dark"
            );
        }
    );
}


/* ============================================================
   MODALES
   ============================================================ */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";
}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.add("hidden");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";
}


/* Cerrar botones X */

document
    .querySelectorAll(
        "[data-close-modal]"
    )
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                closeModal(
                    button.getAttribute(
                        "data-close-modal"
                    )
                );

            }
        );

    });


/* Cerrar haciendo clic fuera */

document
    .querySelectorAll(
        ".modal-backdrop"
    )
    .forEach(function (backdrop) {

        backdrop.addEventListener(
            "click",
            function () {

                const modal =
                    backdrop.closest(
                        ".modal"
                    );

                if (modal) {
                    closeModal(
                        modal.id
                    );
                }

            }
        );

    });


/* Escape */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") {
            return;
        }

        const modal =
            document.querySelector(
                ".modal:not(.hidden)"
            );

        if (modal) {
            closeModal(modal.id);
        }

    }
);


/* ============================================================
   CUENTA
   ============================================================ */

const accountButton =
    document.getElementById(
        "account-button"
    );


function updateAccountUI() {

    const loginPanel =
        document.getElementById(
            "login-panel"
        );

    const registerPanel =
        document.getElementById(
            "register-panel"
        );

    const loggedPanel =
        document.getElementById(
            "logged-panel"
        );

    if (
        !loginPanel ||
        !registerPanel ||
        !loggedPanel
    ) {
        return;
    }


    if (!currentUser) {

        loginPanel.classList.remove(
            "hidden"
        );

        registerPanel.classList.add(
            "hidden"
        );

        loggedPanel.classList.add(
            "hidden"
        );

        return;
    }


    loginPanel.classList.add(
        "hidden"
    );

    registerPanel.classList.add(
        "hidden"
    );

    loggedPanel.classList.remove(
        "hidden"
    );


    const metadata =
        currentUser.user_metadata || {};


    const name =
        document.getElementById(
            "account-name"
        );

    const email =
        document.getElementById(
            "account-email"
        );


    if (name) {

        name.textContent =
            metadata.name ||
            metadata.full_name ||
            "Usuario";

    }


    if (email) {

        email.textContent =
            currentUser.email || "";

    }
}


if (accountButton) {

    accountButton.addEventListener(
        "click",
        function () {

            openModal(
                "account-modal"
            );

            updateAccountUI();

        }
    );
}


/* ============================================================
   LOGIN
   ============================================================ */

const loginForm =
    document.getElementById(
        "login-form"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (
                !supabaseClient ||
                !supabaseClient.auth
            ) {

                showAuthMessage(
                    "Supabase todavía no está configurado.",
                    "error"
                );

                return;
            }


            const email =
                document.getElementById(
                    "login-email"
                ).value.trim();


            const password =
                document.getElementById(
                    "login-password"
                ).value;


            try {

                const result =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email: email,
                            password: password
                        });


                if (result.error) {
                    throw result.error;
                }


                currentUser =
                    result.data.user;


                updateAccountUI();


            } catch (error) {

                showAuthMessage(
                    error.message ||
                    "No se pudo iniciar sesión.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   REGISTRO
   ============================================================ */

const registerForm =
    document.getElementById(
        "register-form"
    );


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                !supabaseClient ||
                !supabaseClient.auth
            ) {

                showAuthMessage(
                    "Supabase todavía no está configurado.",
                    "error"
                );

                return;
            }


            const name =
                document.getElementById(
                    "register-name"
                ).value.trim();


            const email =
                document.getElementById(
                    "register-email"
                ).value.trim();


            const password =
                document.getElementById(
                    "register-password"
                ).value;


            try {

                const result =
                    await supabaseClient.auth
                        .signUp({

                            email: email,

                            password: password,

                            options: {
                                data: {
                                    name: name
                                }
                            }

                        });


                if (result.error) {
                    throw result.error;
                }


                showAuthMessage(
                    "Cuenta creada correctamente.",
                    "success"
                );


                registerForm.reset();


            } catch (error) {

                showAuthMessage(
                    error.message ||
                    "No se pudo crear la cuenta.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   CERRAR SESIÓN
   ============================================================ */

const logoutButton =
    document.getElementById(
        "logout-button"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            if (
                !supabaseClient ||
                !supabaseClient.auth
            ) {

                currentUser = null;

                updateAccountUI();

                return;
            }


            try {

                await supabaseClient.auth
                    .signOut();

                currentUser = null;

                updateAccountUI();

            } catch (error) {

                console.error(
                    "Error cerrando sesión:",
                    error
                );

            }

        }
    );

}


/* ============================================================
   CAMBIAR LOGIN / REGISTRO
   ============================================================ */

const showRegister =
    document.getElementById(
        "show-register"
    );


const showLogin =
    document.getElementById(
        "show-login"
    );


if (showRegister) {

    showRegister.addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "login-panel"
                )
                ?.classList.add(
                    "hidden"
                );


            document
                .getElementById(
                    "register-panel"
                )
                ?.classList.remove(
                    "hidden"
                );

        }
    );

}


if (showLogin) {

    showLogin.addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "register-panel"
                )
                ?.classList.add(
                    "hidden"
                );


            document
                .getElementById(
                    "login-panel"
                )
                ?.classList.remove(
                    "hidden"
                );

        }
    );

}


/* ============================================================
   MENSAJES
   ============================================================ */

function showAuthMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "auth-message"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "auth-message";

    if (type === "error") {

        element.classList.add(
            "error"
        );

    }

    if (type === "success") {

        element.classList.add(
            "success"
        );

    }
}


/* ============================================================
   SUGERIR IDEA
   ============================================================ */

const suggestionButton =
    document.getElementById(
        "new-suggestion-button"
    );


if (suggestionButton) {

    suggestionButton.addEventListener(
        "click",
        function () {

            openModal(
                "suggestion-modal"
            );

        }
    );

}


/* ============================================================
   CONTADOR
   ============================================================ */

const suggestionText =
    document.getElementById(
        "suggestion-text"
    );


const characterCount =
    document.getElementById(
        "character-count"
    );


if (
    suggestionText &&
    characterCount
) {

    suggestionText.addEventListener(
        "input",
        function () {

            characterCount.textContent =
                suggestionText.value.length;

        }
    );

}


/* ============================================================
   SUGERENCIAS
   ============================================================ */

async function loadSuggestions() {

    const list =
        document.getElementById(
            "suggestions-list"
        );


    if (!list) {
        return;
    }


    /*
     * Supabase no está configurado.
     * No hacemos ninguna petición.
     */

    if (
        !supabaseClient ||
        !supabaseClient.auth
    ) {

        list.innerHTML = `
            <div class="suggestions-loading">
                Las sugerencias estarán disponibles cuando se configure Supabase.
            </div>
        `;

        return;
    }


    try {

        const result =
            await supabaseClient
                .from("suggestions")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (result.error) {
            throw result.error;
        }


        list.innerHTML = "";


        if (
            !result.data ||
            result.data.length === 0
        ) {

            list.innerHTML = `
                <div class="suggestions-loading">
                    No hay sugerencias todavía.
                </div>
            `;

            return;
        }


        result.data.forEach(
            function (item) {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "card suggestion-card";


                const header =
                    document.createElement(
                        "div"
                    );

                header.className =
                    "suggestion-header";


                const author =
                    document.createElement(
                        "strong"
                    );

                author.className =
                    "suggestion-author";

                author.textContent =
                    item.name ||
                    "Usuario";


                const date =
                    document.createElement(
                        "span"
                    );

                date.className =
                    "suggestion-date";


                if (item.created_at) {

                    date.textContent =
                        new Date(
                            item.created_at
                        ).toLocaleDateString(
                            "es-ES"
                        );

                }


                header.appendChild(
                    author
                );

                header.appendChild(
                    date
                );


                const category =
                    document.createElement(
                        "span"
                    );

                category.className =
                    "suggestion-category-badge";

                category.textContent =
                    item.category ||
                    "General";


                const text =
                    document.createElement(
                        "p"
                    );

                text.className =
                    "suggestion-text";

                text.textContent =
                    item.text ||
                    "";


                card.appendChild(
                    header
                );

                card.appendChild(
                    category
                );

                card.appendChild(
                    text
                );


                list.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Error cargando sugerencias:",
            error
        );

    }

}


/* ============================================================
   FORMULARIO DE SUGERENCIAS
   ============================================================ */

const suggestionForm =
    document.getElementById(
        "suggestion-form"
    );


if (suggestionForm) {

    suggestionForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (
                !supabaseClient ||
                !supabaseClient.auth
            ) {

                const message =
                    document.getElementById(
                        "suggestion-message"
                    );


                if (message) {

                    message.textContent =
                        "Supabase todavía no está configurado.";

                    message.className =
                        "auth-message error";

                }

                return;
            }


            if (!currentUser) {

                const message =
                    document.getElementById(
                        "suggestion-message"
                    );


                if (message) {

                    message.textContent =
                        "Debes iniciar sesión para enviar una idea.";

                    message.className =
                        "auth-message error";

                }

                return;
            }


            const name =
                document.getElementById(
                    "suggestion-name"
                ).value.trim();


            const category =
                document.getElementById(
                    "suggestion-category-input"
                ).value;


            const text =
                document.getElementById(
                    "suggestion-text"
                ).value.trim();


            try {

                const result =
                    await supabaseClient
                        .from("suggestions")
                        .insert({

                            user_id:
                                currentUser.id,

                            name:
                                name,

                            category:
                                category,

                            text:
                                text,

                            votes:
                                0

                        });


                if (result.error) {
                    throw result.error;
                }


                suggestionForm.reset();


                if (characterCount) {
                    characterCount.textContent =
                        "0";
                }


                const message =
                    document.getElementById(
                        "suggestion-message"
                    );


                if (message) {

                    message.textContent =
                        "Idea enviada correctamente.";

                    message.className =
                        "auth-message success";

                }


                loadSuggestions();


            } catch (error) {

                console.error(
                    "Error enviando sugerencia:",
                    error
                );

            }

        }
    );

}


/* ============================================================
   PESTAÑAS
   ============================================================ */

document
    .querySelectorAll(
        "[data-tab]"
    )
    .forEach(
        function (tab) {

            tab.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            "[data-tab]"
                        )
                        .forEach(
                            function (other) {

                                other.classList.remove(
                                    "active"
                                );

                            }
                        );


                    tab.classList.add(
                        "active"
                    );

                }
            );

        }
    );


/* ============================================================
   SUPABASE AUTH
   ============================================================ */

if (
    supabaseClient &&
    supabaseClient.auth &&
    typeof supabaseClient.auth
        .onAuthStateChange === "function"
) {

    supabaseClient.auth.onAuthStateChange(
        function (
            event,
            session
        ) {

            currentUser =
                session?.user || null;

            updateAccountUI();

            loadSuggestions();

        }
    );

}


/* ============================================================
   INICIO
   ============================================================ */

loadSuggestions();

console.log(
    "TronkStudios: script cargado correctamente."
);
