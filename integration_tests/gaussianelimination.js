// deno-lint-ignore-file

const EPSILON = 1e-20;

function luSolve(coefficientMatrix, constants, mutate = false) {
  const decomposition = luDecompose(coefficientMatrix, mutate);
  if (!decomposition) return undefined;
  return luBackSubstitute(decomposition, constants, mutate);
}

function luDecompose(matrix, mutate = false) {
  const size = matrix.length;
  const permutation = new Array(size);
  const rowScales = new Array(size);

  const workingMatrix = mutate
    ? matrix
    : Array.from(matrix, (row) => Array.from(row));

  for (let scaleRowIndex = 0; scaleRowIndex < size; scaleRowIndex++) {
    let maxMagnitude = 0;
    for (
      let scaleColumnIndex = 0;
      scaleColumnIndex < size;
      scaleColumnIndex++
    ) {
      const magnitude = Math.abs(
        workingMatrix[scaleRowIndex][scaleColumnIndex]
      );
      if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    }
    if (maxMagnitude === 0) return undefined;
    rowScales[scaleRowIndex] = 1 / maxMagnitude;
  }

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex++) {
    for (
      let rowBeforePivot = 0;
      rowBeforePivot < pivotIndex;
      rowBeforePivot++
    ) {
      let sum = workingMatrix[rowBeforePivot][pivotIndex];
      for (
        let columnBeforeRow = 0;
        columnBeforeRow < rowBeforePivot;
        columnBeforeRow++
      ) {
        sum -=
          workingMatrix[rowBeforePivot][columnBeforeRow] *
          workingMatrix[columnBeforeRow][pivotIndex];
      }
      workingMatrix[rowBeforePivot][pivotIndex] = sum;
    }

    let largestScaledValue = 0;
    let largestRowIndex = pivotIndex;

    for (
      let candidateRowIndex = pivotIndex;
      candidateRowIndex < size;
      candidateRowIndex++
    ) {
      let sum = workingMatrix[candidateRowIndex][pivotIndex];
      for (
        let columnBeforePivot = 0;
        columnBeforePivot < pivotIndex;
        columnBeforePivot++
      ) {
        sum -=
          workingMatrix[candidateRowIndex][columnBeforePivot] *
          workingMatrix[columnBeforePivot][pivotIndex];
      }
      workingMatrix[candidateRowIndex][pivotIndex] = sum;

      const scaledValue = rowScales[candidateRowIndex] * Math.abs(sum);
      largestRowIndex =
        scaledValue >= largestScaledValue ? candidateRowIndex : largestRowIndex;
      largestScaledValue =
        scaledValue >= largestScaledValue ? scaledValue : largestScaledValue;
    }

    if (pivotIndex !== largestRowIndex) {
      const tempRow = workingMatrix[pivotIndex];
      workingMatrix[pivotIndex] = workingMatrix[largestRowIndex];
      workingMatrix[largestRowIndex] = tempRow;
      rowScales[largestRowIndex] = rowScales[pivotIndex];
    }

    permutation[pivotIndex] = largestRowIndex;

    if (pivotIndex === size - 1) break;

    if (workingMatrix[pivotIndex][pivotIndex] === 0) {
      workingMatrix[pivotIndex][pivotIndex] = EPSILON;
    }

    const pivotReciprocal = 1 / workingMatrix[pivotIndex][pivotIndex];
    for (
      let targetRowIndex = pivotIndex + 1;
      targetRowIndex < size;
      targetRowIndex++
    ) {
      workingMatrix[targetRowIndex][pivotIndex] *= pivotReciprocal;
    }
  }

  return { matrix: workingMatrix, permutation };
}

function luBackSubstitute(decomposition, constants, mutate = false) {
  const matrix = decomposition.matrix;
  const permutation = decomposition.permutation;
  const size = permutation.length;

  const workingVector = mutate ? constants : Array.from(constants);

  let firstNonZeroRow = -1;
  for (let forwardRowIndex = 0; forwardRowIndex < size; forwardRowIndex++) {
    const permutationRow = permutation[forwardRowIndex];
    let sum = workingVector[permutationRow];
    workingVector[permutationRow] = workingVector[forwardRowIndex];

    if (firstNonZeroRow !== -1) {
      for (
        let forwardColumnIndex = firstNonZeroRow;
        forwardColumnIndex < forwardRowIndex;
        forwardColumnIndex++
      ) {
        sum -=
          matrix[forwardRowIndex][forwardColumnIndex] *
          workingVector[forwardColumnIndex];
      }
    } else if (sum !== 0) {
      firstNonZeroRow = forwardRowIndex;
    }

    workingVector[forwardRowIndex] = sum;
  }

  for (
    let backwardRowIndex = size - 1;
    backwardRowIndex >= 0;
    backwardRowIndex--
  ) {
    let sum = workingVector[backwardRowIndex];
    for (
      let backwardColumnIndex = backwardRowIndex + 1;
      backwardColumnIndex < size;
      backwardColumnIndex++
    ) {
      sum -=
        matrix[backwardRowIndex][backwardColumnIndex] *
        workingVector[backwardColumnIndex];
    }
    workingVector[backwardRowIndex] =
      sum / matrix[backwardRowIndex][backwardRowIndex];
  }

  return workingVector;
}

const coefficientMatrix = [
  [1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [1.0, 0.63, 0.39, 0.25, 0.16, 0.1],
  [1.0, 1.26, 1.58, 1.98, 2.49, 3.13],
  [1.0, 1.88, 3.55, 6.7, 12.62, 23.8],
  [1.0, 2.51, 6.32, 15.88, 39.9, 100.28],
  [1.0, 3.14, 9.87, 31.01, 97.41, 306.02],
];

const constants = [-0.01, 0.61, 0.91, 0.99, 0.6, 0.02];

console.log(luSolve(coefficientMatrix, constants));
