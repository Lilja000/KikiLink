# The reviewed digest is supplied at build time and recorded by the operator.
# Build from cloud/: docker build --build-arg NODE_IMAGE=node@sha256:... -f deploy/Dockerfile .
ARG NODE_IMAGE=node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
FROM ${NODE_IMAGE}
WORKDIR /opt/kikilink-cloud
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY ops/ ./ops/
COPY verifier/ ./verifier/
COPY .env.example ./
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN command -v flock && chmod 0555 deploy/entrypoint.sh
USER 65532:65532
ENTRYPOINT ["/opt/kikilink-cloud/deploy/entrypoint.sh"]
CMD ["node", "src/server.mjs"]
