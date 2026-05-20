# Custom Garage image: dxflrs/garage + garage.toml baked in.
#
# Why: Coolify's docker compose deployment runs from /artifacts/<uuid>/,
# but relative bind mounts (e.g. `./garage.toml:/etc/garage.toml:ro`) can
# fail when Coolify doesn't expose the file properly to docker daemon —
# Docker then creates an empty directory at the source path and Garage
# errors with "IO error: Is a directory (os error 21)".
#
# Baking the config into the image avoids the bind-mount issue entirely.
# Garage v1.0+ supports a handful of env-var overrides
# (GARAGE_RPC_SECRET, etc.) for the secret bits at runtime — see
# https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/

FROM dxflrs/garage:v1.0.1

COPY garage.toml /etc/garage.toml
