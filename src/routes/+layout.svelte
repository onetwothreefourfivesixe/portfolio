<script>
    import "bootstrap/dist/css/bootstrap.min.css";
    let date = new Date().getFullYear();
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
</svelte:head>

<nav
    class="navbar navbar-expand-lg navbar-dark mb-4"
    style="background-color: #002944;"
>
    <div class="container-fluid">
        <a class="navbar-brand" href="/">Edward Lin</a>
        <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
        >
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                    <a class="nav-link" href="#home">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#about">About</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#projects">Projects</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#contact">Contact</a>
                </li>
            </ul>
        </div>
    </div>
</nav>

<slot />

<footer
    class="text-center py-4 mt-auto"
    style="background-color: #002944; color: #7791A3;"
>
    <p>&copy; {date} Edward Lin</p>
</footer>

<style>
    :global(body) {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: #001629;
        color: #7791a3;
    }

    :global(#sveltekit-app) {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    :global(h1),
    :global(h2),
    :global(h3),
    :global(h4),
    :global(h5),
    :global(h6) {
        color: #4a9eff;
    }
    .sectionHeading {
        padding-bottom: 5%;
    }

    :global(a) {
        color: #4a9eff;
    }

    :global(a:hover) {
        color: #7bc8ff;
    }
</style>
