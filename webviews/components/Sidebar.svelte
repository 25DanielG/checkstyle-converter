<script lang="ts">
    import { onMount } from "../../node_modules/svelte";
    import { doCheckstyle, doIndentation } from "../../src/extension";
    onMount(() => {
        // Listen for messages from the extension
        window.addEventListener("message", (event) => {
            const message = event.data;
            switch (message.type) {
                case "onSomething": {
                    // code here...
                    break;
                }
            }
        });
    });
</script>
<h1>Checkstyle-Panel</h1>
<button on:click|once={doCheckstyle}>
	Perform Checkstyle
</button>
<button on:click|once={doIndentation}>
	Perform Indentation
</button>