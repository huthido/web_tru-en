# Custom Garage image: dxflrs/garage binary on debian:bookworm-slim base.
#
# Why:
# 1. Bake garage.toml — Coolify relative bind mounts fail unpredictably
#    ("IO error: Is a directory") when copying single files from artifacts.
# 2. Provide a shell — upstream dxflrs/garage uses distroless base (no
#    /bin/sh) so `docker exec -it ... bash` (and Coolify Terminal) can't
#    open. Bootstrap commands like `/garage layout assign ...` still
#    work via non-interactive `docker exec`, but a shell makes operations
#    much easier.
#
# Trade-off: image ~80MB vs ~30MB distroless. Acceptable for ops UX.
#
# Garage v1.0+ supports env-var overrides for secrets (GARAGE_RPC_SECRET,
# GARAGE_ADMIN_TOKEN, GARAGE_METRICS_TOKEN) — set those in Coolify env
# to override the placeholder values in garage.toml.

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=dxflrs/garage:v1.0.1 /garage /usr/local/bin/garage
COPY garage.toml /etc/garage.toml

EXPOSE 3900 3901 3902 3903

ENTRYPOINT ["/usr/local/bin/garage"]
CMD ["server"]
