import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import * as path from 'path'
import 'dotenv/config'

export class TranscriptionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const transcriptionLambda = new NodejsFunction(this, 'TranscriptionLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../index.ts'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      ephemeralStorageSize: cdk.Size.gibibytes(2),
      environment: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      },
    })

    transcriptionLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:GetObjectVersion',
        ],
        resources: ['arn:aws:s3:::contentport/*', 'arn:aws:s3:::*/*'],
      })
    )

    new cdk.CfnOutput(this, 'LambdaArn', {
      value: transcriptionLambda.functionArn,
      description: 'Transcription Lambda ARN',
    })

    new cdk.CfnOutput(this, 'LambdaName', {
      value: transcriptionLambda.functionName,
      description: 'Transcription Lambda Name',
    })
  }
}
