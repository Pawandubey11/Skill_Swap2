pipeline {
    agent any

    stages {
        stage('Clone Git Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/Pawandubey11/SkillSwap.git'
            }
        }

        stage('Create Dockerfile') {
            steps {
                sh '''
cat > Dockerfile <<'EOF'
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
EOF
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t my-node-app:latest .'
            }
        }

        stage('Run Container') {
            steps {
                sh '''
docker rm -f my-node-app || true
docker run -d --name my-node-app -p 3000:3000 my-node-app:latest
                '''
            }
        }
    }
}
