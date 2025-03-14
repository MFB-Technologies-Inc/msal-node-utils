# msal-node-utils

Utilities for easier node msal authentication

## azureTokenGetter

### Authentication

This utility will try get a token silently, and, if that fails, will try interactively, using `open` to open the browser.

### Cache Persistance

This is basically exactly what is described here:

https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/extensions/msal-node-extensions

On linux (including in a linux docker container), I've found it easiest to use gnome-keyring (even if you aren't using Gnome desktop; I'm just using an X server on my host).

I've installed at least

```bash
sudo apt-get -y dbus-x11 libsecret-1-0 libsecret-1-dev libsecret-tools gnome-keyring xdg-utils
```

on an Ubuntu 24 docker container.
