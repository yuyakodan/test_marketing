declare module 'jstat' {
  interface JStatStatic {
    normal: {
      cdf(x: number, mean: number, std: number): number
      pdf(x: number, mean: number, std: number): number
      inv(p: number, mean: number, std: number): number
      sample(mean: number, std: number): number
    }
    beta: {
      cdf(x: number, alpha: number, beta: number): number
      pdf(x: number, alpha: number, beta: number): number
      inv(p: number, alpha: number, beta: number): number
      sample(alpha: number, beta: number): number
    }
    studentt: {
      cdf(x: number, df: number): number
      pdf(x: number, df: number): number
      inv(p: number, df: number): number
    }
    chisquare: {
      cdf(x: number, df: number): number
      pdf(x: number, df: number): number
      inv(p: number, df: number): number
    }
    mean(arr: number[]): number
    stdev(arr: number[], flag?: boolean): number
    variance(arr: number[], flag?: boolean): number
    median(arr: number[]): number
    sum(arr: number[]): number
    min(arr: number[]): number
    max(arr: number[]): number
  }

  const jStat: JStatStatic
  export = jStat
}
