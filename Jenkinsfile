pipeline {
    agent any

    stages {

        stage('Clone Git Repo') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Pawandubey11/Skill_Swap2.git'
            }
        }

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
docker run -d --name my-node-app -p 3000:3000 my-node-app:latest
'''
            }
        }
    }
}
