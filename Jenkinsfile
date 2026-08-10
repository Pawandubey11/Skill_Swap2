pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build --no-cache -t my-node-app:latest .
                '''
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                    docker rm -f my-node-app || true

                    docker run -d \
                      --name my-node-app \
                      -p 3000:3000 \
                      --env-file .env \
                      my-node-app:latest
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "Waiting for application..."

                    sleep 5

                    curl --fail http://localhost:3000

                    echo "Application is healthy"
                '''
            }
        }
    }
}
