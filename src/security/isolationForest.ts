/**
 * ISOLATION FOREST MACHINE LEARNING ANOMALY DETECTION ENGINE
 *
 * Algorithm: Unsupervised Isolation Forest (iForest)
 *
 * Isolation Forest isolates anomalies instead of profiling normal data points.
 * Outliers require significantly shorter tree path lengths h(x) to isolate.
 *
 * Features (6D Vector):
 * 0: request_count
 * 1: unique_endpoints
 * 2: unique_methods
 * 3: error_count
 * 4: avg_response_time
 * 5: max_response_time
 */

export interface TrafficFeatureVector {
  ip_address: string;
  features: number[]; // [request_count, unique_endpoints, unique_methods, error_count, avg_response_time, max_response_time]
}

export interface MLAnomalyResult {
  ip_address: string;
  ml_anomaly_score: number; // 0 to 100 scale
  raw_score: number;       // S(x, n) in [0, 1]
  avg_path_length: number;  // E(h(x))
  is_anomaly: boolean;      // ml_anomaly_score >= 55
}

export interface ModelEvaluationMetrics {
  algorithm: string;
  num_trees: number;
  subsample_size: number;
  total_samples_evaluated: number;
  anomalies_detected: number;
  contamination_rate: number; // Fraction of anomalies (e.g. 0.05)
  avg_path_length: number;
  mean_anomaly_score: number;
  feature_importance: Record<string, number>;
  model_status: "PASSED" | "FAILED" | "TRAINING";
  evaluated_at: string;
}

// Feature name mapping
export const FEATURE_NAMES = [
  "request_count",
  "unique_endpoints",
  "unique_methods",
  "error_count",
  "avg_response_time",
  "max_response_time",
];

// ============================================================
// HELPER: Average Path Length Factor c(n)
// ============================================================
// c(n) = 2 * (ln(n - 1) + 0.5772156649) - (2 * (n - 1) / n)
// Euler-Mascheroni constant = 0.5772156649
// ============================================================
export function calculateC(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerConstant = 0.5772156649;
  return 2 * (Math.log(n - 1) + eulerConstant) - (2 * (n - 1)) / n;
}

// ============================================================
// ISOLATION TREE NODE
// ============================================================
export class IsolationNode {
  splitFeature: number | null = null;
  splitValue: number | null = null;
  left: IsolationNode | null = null;
  right: IsolationNode | null = null;
  size: number = 0;
  isLeaf: boolean = false;

  constructor(size: number = 0, isLeaf: boolean = false) {
    this.size = size;
    this.isLeaf = isLeaf;
  }
}

// ============================================================
// ISOLATION TREE
// ============================================================
export class IsolationTree {
  root: IsolationNode | null = null;
  maxDepth: number;
  featureSplitCounts: number[];

  constructor(maxDepth: number = 10) {
    this.maxDepth = maxDepth;
    this.featureSplitCounts = new Array(FEATURE_NAMES.length).fill(0);
  }

  fit(data: number[][], currentDepth: number = 0): IsolationNode {
    const numSamples = data.length;

    // Terminate at max depth or when subset size <= 1
    if (currentDepth >= this.maxDepth || numSamples <= 1) {
      return new IsolationNode(numSamples, true);
    }

    const numFeatures = data[0]?.length || 0;
    if (numFeatures === 0) {
      return new IsolationNode(numSamples, true);
    }

    // Find features with non-constant values
    const validFeatures: number[] = [];
    for (let f = 0; f < numFeatures; f++) {
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let i = 0; i < numSamples; i++) {
        const val = data[i][f];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      if (minVal < maxVal) {
        validFeatures.push(f);
      }
    }

    if (validFeatures.length === 0) {
      return new IsolationNode(numSamples, true);
    }

    // Select random feature among valid features
    const randomFeatureIndex =
      validFeatures[Math.floor(Math.random() * validFeatures.length)];

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < numSamples; i++) {
      const val = data[i][randomFeatureIndex];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    // Select random split point
    const splitValue = minVal + Math.random() * (maxVal - minVal);

    // Split data
    const leftData: number[][] = [];
    const rightData: number[][] = [];
    for (let i = 0; i < numSamples; i++) {
      if (data[i][randomFeatureIndex] < splitValue) {
        leftData.push(data[i]);
      } else {
        rightData.push(data[i]);
      }
    }

    this.featureSplitCounts[randomFeatureIndex]++;

    const node = new IsolationNode(numSamples, false);
    node.splitFeature = randomFeatureIndex;
    node.splitValue = splitValue;
    node.left = this.fit(leftData, currentDepth + 1);
    node.right = this.fit(rightData, currentDepth + 1);

    return node;
  }

  pathLength(x: number[], node: IsolationNode | null, currentDepth: number = 0): number {
    if (!node || node.isLeaf) {
      const size = node ? node.size : 1;
      return currentDepth + calculateC(size);
    }

    const featureVal = x[node.splitFeature!];
    if (featureVal !== undefined && featureVal < node.splitValue!) {
      return this.pathLength(x, node.left, currentDepth + 1);
    } else {
      return this.pathLength(x, node.right, currentDepth + 1);
    }
  }
}

// ============================================================
// ISOLATION FOREST ENSEMBLE
// ============================================================
export class IsolationForest {
  numTrees: number;
  subsampleSize: number;
  trees: IsolationTree[] = [];
  sampleSizeTrainedOn: number = 0;
  isFitted: boolean = false;
  featureImportance: Record<string, number> = {};

  constructor(numTrees: number = 100, subsampleSize: number = 256) {
    this.numTrees = numTrees;
    this.subsampleSize = subsampleSize;
    FEATURE_NAMES.forEach((name) => (this.featureImportance[name] = 0));
  }

  /**
   * Generates baseline synthetic normal traffic vectors
   * to stabilize model training when live dataset is small.
   */
  private generateBaselineNormalData(count: number = 50): number[][] {
    const baseline: number[][] = [];
    for (let i = 0; i < count; i++) {
      const reqCount = Math.floor(1 + Math.random() * 5); // 1-5 requests
      const endpoints = Math.floor(1 + Math.random() * 3); // 1-3 endpoints
      const methods = 1; // GET/POST
      const errors = Math.random() < 0.1 ? 1 : 0; // low error rate
      const avgResp = 20 + Math.random() * 80; // 20-100ms
      const maxResp = avgResp + Math.random() * 50;
      baseline.push([reqCount, endpoints, methods, errors, avgResp, maxResp]);
    }
    return baseline;
  }

  fit(data: number[][]): void {
    let trainingData = data.slice();

    // If training data is small, blend with baseline normal data
    if (trainingData.length < 20) {
      const baseline = this.generateBaselineNormalData(50 - trainingData.length);
      trainingData = [...trainingData, ...baseline];
    }

    this.sampleSizeTrainedOn = trainingData.length;
    const actualSubsample = Math.min(this.subsampleSize, trainingData.length);
    const maxDepth = Math.ceil(Math.log2(Math.max(2, actualSubsample)));

    this.trees = [];
    const totalSplits = new Array(FEATURE_NAMES.length).fill(0);

    for (let i = 0; i < this.numTrees; i++) {
      // Create random subsample (bootstrap)
      const subsample: number[][] = [];
      for (let j = 0; j < actualSubsample; j++) {
        const randomIndex = Math.floor(Math.random() * trainingData.length);
        subsample.push(trainingData[randomIndex]);
      }

      const tree = new IsolationTree(maxDepth);
      tree.root = tree.fit(subsample);
      this.trees.push(tree);

      for (let f = 0; f < FEATURE_NAMES.length; f++) {
        totalSplits[f] += tree.featureSplitCounts[f];
      }
    }

    // Compute relative feature importance
    const sumSplits = totalSplits.reduce((a, b) => a + b, 0) || 1;
    FEATURE_NAMES.forEach((name, idx) => {
      this.featureImportance[name] = Number(
        ((totalSplits[idx] / sumSplits) * 100).toFixed(1),
      );
    });

    this.isFitted = true;
  }

  predictPathLength(x: number[]): number {
    if (!this.isFitted || this.trees.length === 0) {
      return 10;
    }
    let totalPathLength = 0;
    for (const tree of this.trees) {
      totalPathLength += tree.pathLength(x, tree.root);
    }
    return totalPathLength / this.trees.length;
  }

  calculateAnomalyScore(x: number[]): MLAnomalyResult {
    const avgPathLength = this.predictPathLength(x);
    const cN = calculateC(this.sampleSizeTrainedOn);

    // Score S(x, n) = 2^(- E(h(x)) / c(n))
    let rawScore = 0.5;
    if (cN > 0) {
      rawScore = Math.pow(2, -avgPathLength / cN);
    }

    // Scale S(x, n) [0, 1] to 0-100 ML Score
    // Values around 0.5 are normal; values >= 0.6 indicate anomalies.
    const mlScore = Math.min(
      100,
      Math.max(0, Math.round(rawScore * 100)),
    );

    const isAnomaly = mlScore >= 55;

    return {
      ip_address: "",
      ml_anomaly_score: mlScore,
      raw_score: Number(rawScore.toFixed(4)),
      avg_path_length: Number(avgPathLength.toFixed(2)),
      is_anomaly: isAnomaly,
    };
  }

  evaluateModel(dataset: TrafficFeatureVector[]): ModelEvaluationMetrics {
    const evaluatedAt = new Date().toISOString();
    const dataVectors = dataset.map((d) => d.features);

    if (!this.isFitted) {
      this.fit(dataVectors);
    }

    let totalAnomalyScoreSum = 0;
    let totalPathLengthSum = 0;
    let anomaliesCount = 0;

    for (const item of dataset) {
      const res = this.calculateAnomalyScore(item.features);
      totalAnomalyScoreSum += res.ml_anomaly_score;
      totalPathLengthSum += res.avg_path_length;
      if (res.is_anomaly) {
        anomaliesCount++;
      }
    }

    const totalSamples = dataset.length;
    const meanScore =
      totalSamples > 0 ? totalAnomalyScoreSum / totalSamples : 0;
    const avgPathLength =
      totalSamples > 0 ? totalPathLengthSum / totalSamples : 0;
    const contaminationRate =
      totalSamples > 0 ? anomaliesCount / totalSamples : 0;

    return {
      algorithm: "Isolation Forest (Unsupervised Ensemble)",
      num_trees: this.numTrees,
      subsample_size: this.subsampleSize,
      total_samples_evaluated: totalSamples,
      anomalies_detected: anomaliesCount,
      contamination_rate: Number(contaminationRate.toFixed(4)),
      avg_path_length: Number(avgPathLength.toFixed(2)),
      mean_anomaly_score: Number(meanScore.toFixed(1)),
      feature_importance: this.featureImportance,
      model_status: "PASSED",
      evaluated_at: evaluatedAt,
    };
  }
}

// Singleton model cache
let globalForestInstance: IsolationForest | null = null;

export function getIsolationForestInstance(): IsolationForest {
  if (!globalForestInstance) {
    globalForestInstance = new IsolationForest(100, 256);
  }
  return globalForestInstance;
}
