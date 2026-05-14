# Stage 1: Build the Web App
FROM node:22-alpine AS web-build
WORKDIR /app/web
RUN npm install -g pnpm
COPY web-app/package.json web-app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web-app/ ./
RUN pnpm run build

# Stage 2: Build the API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY api/api.csproj ./
RUN dotnet restore "./api.csproj"
COPY api/ ./
RUN dotnet publish "./api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

# Install Kerberos library required by Npgsql
RUN apt-get update && apt-get install -y libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=api-build /app/publish .
COPY --from=web-build /app/web/dist ./wwwroot
EXPOSE 8080
ENTRYPOINT ["dotnet", "api.dll"]
