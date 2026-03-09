"use client"

import { useState, useCallback, useRef } from "react"
import { Camera, Upload, TrendingUp, AlertCircle, CheckCircle2, SwitchCamera, Square, FileText, Clock, Target, Zap, Dumbbell, Activity } from "lucide-react"
import dynamic from "next/dynamic"

const MediaPipePoseDetection = dynamic(
  () => import("@/components/MediaPipePoseDetection"),
  { ssr: false }
)

// ============================================================
// EXERCISE DATABASE — angles, phases, faults, feedback
// ============================================================

interface ExerciseDef {
  id: string
  name: string
  category: "pernas" | "bracos" | "tronco" | "combinado"
  muscles: string[]
  phases: string[]
  // Detection signature: which angles/positions define this exercise
  detect: (ctx: AnalysisCtx) => number // 0-100 confidence
  // Evaluate quality
  evaluate: (ctx: AnalysisCtx) => { score: number; feedback: Feedback[]; phase: string; details: Record<string, number> }
}

interface Feedback {
  type: "success" | "warning" | "error" | "info"
  title: string
  desc: string
}

interface AnalysisCtx {
  lm: any[] // 33 landmarks
  angles: Record<string, number>
  cal: CalibrationData
  prev: { phase: string; hipY: number; elbowAngle: number; shoulderAngle: number }
}

interface CalibrationData {
  standingHipY: number
  standingKneeAngle: number
  standingElbowAngle: number
  standingShoulderAngle: number
  bodyHeight: number
  shoulderWidth: number
  calibrated: boolean
  frameCount: number
  samples: any[]
  bodyOrientation: "upright" | "horizontal" | "unknown"
}

function createCalibration(): CalibrationData {
  return {
    standingHipY: 0, standingKneeAngle: 170, standingElbowAngle: 165,
    standingShoulderAngle: 10, bodyHeight: 0, shoulderWidth: 0,
    calibrated: false, frameCount: 0, samples: [],
    bodyOrientation: "unknown"
  }
}

function calcAngle(a: any, b: any, c: any): number {
  const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let d = Math.abs((r * 180) / Math.PI)
  return d > 180 ? 360 - d : d
}

function avgY(...pts: any[]) { return pts.reduce((s, p) => s + p.y, 0) / pts.length }
function avgX(...pts: any[]) { return pts.reduce((s, p) => s + p.x, 0) / pts.length }
function dist(a: any, b: any) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

function getAllAngles(lm: any[]) {
  return {
    kneeR: calcAngle(lm[24], lm[26], lm[28]),
    kneeL: calcAngle(lm[23], lm[25], lm[27]),
    hipR: calcAngle(lm[12], lm[24], lm[26]),
    hipL: calcAngle(lm[11], lm[23], lm[25]),
    elbowR: calcAngle(lm[12], lm[14], lm[16]),
    elbowL: calcAngle(lm[11], lm[13], lm[15]),
    shoulderR: calcAngle(lm[14], lm[12], lm[24]),
    shoulderL: calcAngle(lm[13], lm[11], lm[23]),
    trunkAngle: calcAngle(lm[12], lm[24], { x: lm[24].x, y: lm[24].y - 1 }),
  }
}

// ============================================================
// EXERCISE DEFINITIONS
// ============================================================

const EXERCISES: ExerciseDef[] = [
  // --- SQUAT ---
  {
    id: "squat", name: "Agachamento", category: "pernas",
    muscles: ["Quadriceps", "Gluteos", "Isquiotibiais", "Core"],
    phases: ["Posicao Alta", "Descida", "Posicao Baixa", "Subida"],
    detect: (ctx) => {
      const { angles, cal } = ctx
      if (cal.bodyOrientation === "horizontal") return 0
      const kneeAvg = (angles.kneeR + angles.kneeL) / 2
      const hipAvg = (angles.hipR + angles.hipL) / 2
      // Squat: both knees bend, hips go back, trunk stays relatively upright
      const kneeBend = kneeAvg < 160 ? 40 : 10
      const hipBend = hipAvg < 160 ? 30 : 5
      const upright = angles.trunkAngle > 50 ? 30 : 10
      return kneeBend + hipBend + upright
    },
    evaluate: (ctx) => {
      const { angles, cal, lm } = ctx
      const hipDisp = cal.bodyHeight > 0 ? (avgY(lm[23], lm[24]) - cal.standingHipY) / cal.bodyHeight : 0
      const kneeBend = 1 - ((angles.kneeR + angles.kneeL) / 2) / cal.standingKneeAngle
      const kneeDiff = Math.abs(angles.kneeR - angles.kneeL)
      const trunkLean = Math.abs(avgX(lm[11], lm[12]) - avgX(lm[23], lm[24]))
      const kneeOverToe = Math.abs(lm[26].x - lm[28].x)

      // Phase
      let phase = "Posicao Alta"
      if (hipDisp > 0.15 || kneeBend > 0.25) phase = "Posicao Baixa"
      else if (hipDisp > 0.05) phase = ctx.prev.hipY < avgY(lm[23], lm[24]) ? "Descida" : "Subida"

      // Score components
      const depthS = hipDisp >= 0.15 ? 30 : hipDisp >= 0.10 ? 22 : hipDisp >= 0.05 ? 15 : 5
      const symS = kneeDiff < 5 ? 25 : kneeDiff < 10 ? 20 : kneeDiff < 15 ? 12 : 5
      const postS = trunkLean < 0.03 ? 25 : trunkLean < 0.06 ? 20 : trunkLean < 0.10 ? 12 : 5
      const stabS = kneeOverToe < 0.05 ? 20 : kneeOverToe < 0.08 ? 15 : kneeOverToe < 0.12 ? 10 : 5

      const fb: Feedback[] = []
      if (kneeDiff > 15) fb.push({ type: "warning", title: "Assimetria Joelhos", desc: kneeDiff.toFixed(0) + " graus de diferenca" })
      else fb.push({ type: "success", title: "Joelhos Alinhados", desc: "Simetria " + (100 - kneeDiff).toFixed(0) + "%" })

      if (phase === "Posicao Baixa") {
        if (hipDisp >= 0.15) fb.push({ type: "success", title: "Profundidade OK", desc: "Boa amplitude" })
        else fb.push({ type: "info", title: "Pouca Profundidade", desc: "Desca mais para ativar gluteos" })
      }
      if (trunkLean > 0.10) fb.push({ type: "error", title: "Inclinacao Excessiva", desc: "Mantenha tronco ereto" })
      else if (trunkLean < 0.06) fb.push({ type: "success", title: "Postura OK", desc: "Coluna alinhada" })
      if (kneeOverToe > 0.12) fb.push({ type: "warning", title: "Joelhos Avancados", desc: "Joelhos passando dos pes" })

      return { score: depthS + symS + postS + stabS, feedback: fb, phase, details: { Profundidade: depthS, Simetria: symS, Postura: postS, Estabilidade: stabS } }
    }
  },

  // --- LUNGE / AFUNDO ---
  {
    id: "lunge", name: "Afundo / Lunge", category: "pernas",
    muscles: ["Quadriceps", "Gluteos", "Isquiotibiais"],
    phases: ["Em Pe", "Descida", "Posicao Baixa", "Subida"],
    detect: (ctx) => {
      const { angles, lm } = ctx
      if (ctx.cal.bodyOrientation === "horizontal") return 0
      // Lunge: one knee much more bent than other, feet split front/back
      const kneeDiff = Math.abs(angles.kneeR - angles.kneeL)
      const feetSpread = Math.abs(lm[27].y - lm[28].y) // vertical spread in normalized coords
      const asymmetric = kneeDiff > 20 ? 40 : kneeDiff > 10 ? 20 : 5
      const spread = feetSpread > 0.1 ? 35 : feetSpread > 0.05 ? 15 : 5
      const upright = angles.trunkAngle > 60 ? 25 : 10
      return asymmetric + spread + upright
    },
    evaluate: (ctx) => {
      const { angles, lm, cal } = ctx
      const frontKnee = angles.kneeR < angles.kneeL ? "R" : "L"
      const fKneeAngle = frontKnee === "R" ? angles.kneeR : angles.kneeL
      const bKneeAngle = frontKnee === "R" ? angles.kneeL : angles.kneeR
      const trunkLean = Math.abs(avgX(lm[11], lm[12]) - avgX(lm[23], lm[24]))

      let phase = "Em Pe"
      if (fKneeAngle < 110) phase = "Posicao Baixa"
      else if (fKneeAngle < 150) phase = ctx.prev.hipY < avgY(lm[23], lm[24]) ? "Descida" : "Subida"

      const depthS = fKneeAngle <= 90 ? 30 : fKneeAngle <= 110 ? 22 : fKneeAngle <= 130 ? 15 : 5
      const alignS = trunkLean < 0.04 ? 25 : trunkLean < 0.07 ? 18 : trunkLean < 0.10 ? 10 : 5
      const backKneeS = bKneeAngle < 120 ? 25 : bKneeAngle < 140 ? 18 : 10
      const postS = angles.trunkAngle > 70 ? 20 : angles.trunkAngle > 50 ? 15 : 8

      const fb: Feedback[] = []
      if (fKneeAngle <= 90) fb.push({ type: "success", title: "Angulo Ideal", desc: "Joelho frontal em ~90 graus" })
      else if (fKneeAngle > 130) fb.push({ type: "info", title: "Desca Mais", desc: "Busque 90 graus no joelho frontal" })
      if (trunkLean > 0.08) fb.push({ type: "warning", title: "Tronco Desalinhado", desc: "Mantenha tronco centralizado" })
      else fb.push({ type: "success", title: "Alinhamento OK", desc: "Tronco centralizado" })
      if (angles.trunkAngle < 50) fb.push({ type: "error", title: "Inclinacao Frontal", desc: "Nao incline para frente" })

      return { score: depthS + alignS + backKneeS + postS, feedback: fb, phase, details: { Profundidade: depthS, Alinhamento: alignS, "Joelho Tras": backKneeS, Postura: postS } }
    }
  },

  // --- DEADLIFT / LEVANTAMENTO TERRA ---
  {
    id: "deadlift", name: "Levantamento Terra", category: "pernas",
    muscles: ["Isquiotibiais", "Gluteos", "Eretores da Espinha", "Core"],
    phases: ["Em Pe", "Descida", "Posicao Baixa", "Subida"],
    detect: (ctx) => {
      const { angles, cal } = ctx
      if (cal.bodyOrientation === "horizontal") return 0
      // Deadlift: hip hinge — hip angle drops significantly, knee stays relatively straight
      const hipBend = (angles.hipR + angles.hipL) / 2
      const kneeAvg = (angles.kneeR + angles.kneeL) / 2
      const hipScore = hipBend < 140 ? 45 : hipBend < 160 ? 25 : 5
      const kneeStays = kneeAvg > 140 ? 30 : kneeAvg > 120 ? 15 : 0
      const trunkForward = angles.trunkAngle < 60 ? 25 : 10
      return hipScore + kneeStays + trunkForward
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const hipAvg = (angles.hipR + angles.hipL) / 2
      const kneeAvg = (angles.kneeR + angles.kneeL) / 2
      const spineNeutral = Math.abs(lm[11].y - lm[12].y) < 0.03

      let phase = "Em Pe"
      if (hipAvg < 120) phase = "Posicao Baixa"
      else if (hipAvg < 160) phase = ctx.prev.hipY < avgY(lm[23], lm[24]) ? "Descida" : "Subida"

      const hingeS = hipAvg <= 100 ? 30 : hipAvg <= 130 ? 22 : hipAvg <= 150 ? 12 : 5
      const kneeS = kneeAvg > 150 ? 25 : kneeAvg > 130 ? 18 : 10
      const spineS = spineNeutral ? 25 : 12
      const symS = Math.abs(angles.hipR - angles.hipL) < 10 ? 20 : Math.abs(angles.hipR - angles.hipL) < 20 ? 12 : 5

      const fb: Feedback[] = []
      if (!spineNeutral) fb.push({ type: "error", title: "Coluna Desalinhada", desc: "Mantenha coluna neutra durante o movimento" })
      else fb.push({ type: "success", title: "Coluna Neutra", desc: "Boa posicao da coluna" })
      if (kneeAvg < 130) fb.push({ type: "warning", title: "Flexao Excessiva Joelhos", desc: "Mantenha joelhos mais estendidos" })
      if (hipAvg <= 100) fb.push({ type: "success", title: "Amplitude Completa", desc: "Hip hinge completo" })
      else if (phase !== "Em Pe") fb.push({ type: "info", title: "Amplitude Parcial", desc: "Incline mais o tronco" })

      return { score: hingeS + kneeS + spineS + symS, feedback: fb, phase, details: { "Hip Hinge": hingeS, Joelhos: kneeS, Coluna: spineS, Simetria: symS } }
    }
  },

  // --- PUSH-UP / FLEXAO ---
  {
    id: "pushup", name: "Flexao de Braco", category: "tronco",
    muscles: ["Peitoral", "Triceps", "Deltoides Anterior", "Core"],
    phases: ["Posicao Alta", "Descida", "Posicao Baixa", "Subida"],
    detect: (ctx) => {
      const { angles, lm, cal } = ctx
      // Push-up: body is horizontal, elbows bend
      const bodyHoriz = Math.abs(lm[12].y - lm[24].y) < 0.15
      const handsOnGround = lm[16].y > lm[12].y && lm[15].y > lm[11].y
      const elbowBend = (angles.elbowR + angles.elbowL) / 2 < 160

      const horizS = bodyHoriz ? 40 : 10
      const handsS = handsOnGround ? 30 : 5
      const elbowS = elbowBend ? 30 : 15
      return horizS + handsS + elbowS
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const elbowAvg = (angles.elbowR + angles.elbowL) / 2
      const hipSag = Math.abs(avgY(lm[23], lm[24]) - ((avgY(lm[11], lm[12]) + avgY(lm[27], lm[28])) / 2))
      const elbowFlare = Math.abs(lm[14].x - lm[12].x)

      let phase = "Posicao Alta"
      if (elbowAvg < 100) phase = "Posicao Baixa"
      else if (elbowAvg < 150) phase = ctx.prev.elbowAngle > elbowAvg ? "Descida" : "Subida"

      const depthS = elbowAvg <= 90 ? 30 : elbowAvg <= 110 ? 22 : elbowAvg <= 140 ? 12 : 5
      const coreS = hipSag < 0.04 ? 25 : hipSag < 0.07 ? 18 : hipSag < 0.10 ? 10 : 5
      const elbowPosS = elbowFlare < 0.10 ? 25 : elbowFlare < 0.15 ? 18 : 10
      const symS = Math.abs(angles.elbowR - angles.elbowL) < 10 ? 20 : Math.abs(angles.elbowR - angles.elbowL) < 20 ? 12 : 5

      const fb: Feedback[] = []
      if (hipSag > 0.07) fb.push({ type: "error", title: "Quadril Desalinhado", desc: "Mantenha o corpo reto, core ativado" })
      else fb.push({ type: "success", title: "Core Ativado", desc: "Corpo em linha reta" })
      if (elbowFlare > 0.15) fb.push({ type: "warning", title: "Cotovelos Abertos", desc: "Mantenha cotovelos a ~45 graus do corpo" })
      else fb.push({ type: "success", title: "Posicao Cotovelos OK", desc: "Boa posicao dos cotovelos" })
      if (elbowAvg <= 90) fb.push({ type: "success", title: "Amplitude Completa", desc: "Peito proximo ao chao" })
      else if (phase === "Posicao Baixa") fb.push({ type: "info", title: "Desca Mais", desc: "Busque 90 graus nos cotovelos" })

      return { score: depthS + coreS + elbowPosS + symS, feedback: fb, phase, details: { Amplitude: depthS, Core: coreS, Cotovelos: elbowPosS, Simetria: symS } }
    }
  },

  // --- BICEP CURL / ROSCA ---
  {
    id: "bicep_curl", name: "Rosca Biceps", category: "bracos",
    muscles: ["Biceps", "Braquial", "Braquiorradial"],
    phases: ["Extensao", "Contracao", "Pico", "Retorno"],
    detect: (ctx) => {
      const { angles, cal, lm } = ctx
      if (cal.bodyOrientation === "horizontal") return 0
      // Bicep curl: upright, elbow flexion, upper arm stays close to body
      const upright = angles.trunkAngle > 70 ? 25 : 5
      const elbowMoving = Math.abs((angles.elbowR + angles.elbowL) / 2 - cal.standingElbowAngle) > 20 ? 35 : 10
      // Shoulders stay low (not a press)
      const shoulderStays = (angles.shoulderR + angles.shoulderL) / 2 < 50 ? 25 : 5
      // Knees straight (not squat)
      const kneeStraight = (angles.kneeR + angles.kneeL) / 2 > 155 ? 15 : 0
      return upright + elbowMoving + shoulderStays + kneeStraight
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const elbowAvg = (angles.elbowR + angles.elbowL) / 2
      const upperArmStill = Math.abs(lm[14].x - lm[12].x) + Math.abs(lm[13].x - lm[11].x)
      const bodySwing = Math.abs(angles.trunkAngle - 90)

      let phase = "Extensao"
      if (elbowAvg < 60) phase = "Pico"
      else if (elbowAvg < 110) phase = ctx.prev.elbowAngle > elbowAvg ? "Contracao" : "Retorno"

      const romS = elbowAvg <= 50 ? 30 : elbowAvg <= 70 ? 22 : elbowAvg <= 100 ? 15 : 5
      const upperArmS = upperArmStill < 0.08 ? 25 : upperArmStill < 0.12 ? 18 : 10
      const swingS = bodySwing < 10 ? 25 : bodySwing < 20 ? 18 : bodySwing < 30 ? 10 : 5
      const symS = Math.abs(angles.elbowR - angles.elbowL) < 15 ? 20 : Math.abs(angles.elbowR - angles.elbowL) < 25 ? 12 : 5

      const fb: Feedback[] = []
      if (upperArmStill > 0.12) fb.push({ type: "warning", title: "Braco se Movendo", desc: "Mantenha os bracos fixos junto ao corpo" })
      else fb.push({ type: "success", title: "Bracos Fixos", desc: "Boa estabilidade dos bracos" })
      if (bodySwing > 20) fb.push({ type: "error", title: "Balanco do Corpo", desc: "Nao balance o tronco para ajudar" })
      else fb.push({ type: "success", title: "Corpo Estavel", desc: "Sem balanco" })
      if (elbowAvg <= 50) fb.push({ type: "success", title: "Contracao Total", desc: "Pico de contracao completo" })
      else if (phase === "Pico" || phase === "Contracao") fb.push({ type: "info", title: "Contraia Mais", desc: "Suba mais para contracao total" })

      return { score: romS + upperArmS + swingS + symS, feedback: fb, phase, details: { Amplitude: romS, "Braco Fixo": upperArmS, Estabilidade: swingS, Simetria: symS } }
    }
  },

  // --- SHOULDER PRESS / DESENVOLVIMENTO ---
  {
    id: "shoulder_press", name: "Desenvolvimento (Ombros)", category: "bracos",
    muscles: ["Deltoides", "Triceps", "Trapezio Superior"],
    phases: ["Posicao Inicial", "Subida", "Extensao Total", "Descida"],
    detect: (ctx) => {
      const { angles, cal, lm } = ctx
      if (cal.bodyOrientation === "horizontal") return 0
      // Shoulder press: upright, arms go overhead, shoulder angle increases
      const upright = angles.trunkAngle > 70 ? 20 : 5
      const shoulderHigh = (angles.shoulderR + angles.shoulderL) / 2 > 90 ? 40 : (angles.shoulderR + angles.shoulderL) / 2 > 50 ? 20 : 5
      const elbowMoving = (angles.elbowR + angles.elbowL) / 2 < 160 || (angles.elbowR + angles.elbowL) / 2 > 160 ? 20 : 10
      const kneeStraight = (angles.kneeR + angles.kneeL) / 2 > 155 ? 20 : 5
      return upright + shoulderHigh + elbowMoving + kneeStraight
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const shoulderAvg = (angles.shoulderR + angles.shoulderL) / 2
      const elbowAvg = (angles.elbowR + angles.elbowL) / 2
      const bodyLean = Math.abs(angles.trunkAngle - 90)

      let phase = "Posicao Inicial"
      if (elbowAvg > 160 && shoulderAvg > 150) phase = "Extensao Total"
      else if (shoulderAvg > 90) phase = ctx.prev.shoulderAngle < shoulderAvg ? "Subida" : "Descida"

      const extS = elbowAvg >= 160 && shoulderAvg >= 150 ? 30 : shoulderAvg >= 120 ? 22 : shoulderAvg >= 80 ? 15 : 5
      const leanS = bodyLean < 10 ? 25 : bodyLean < 20 ? 18 : bodyLean < 30 ? 10 : 5
      const symS = Math.abs(angles.shoulderR - angles.shoulderL) < 10 ? 25 : Math.abs(angles.shoulderR - angles.shoulderL) < 20 ? 15 : 5
      const elbowS = Math.abs(angles.elbowR - angles.elbowL) < 10 ? 20 : Math.abs(angles.elbowR - angles.elbowL) < 20 ? 12 : 5

      const fb: Feedback[] = []
      if (bodyLean > 20) fb.push({ type: "error", title: "Inclinacao Lombar", desc: "Nao arqueie as costas ao empurrar" })
      else fb.push({ type: "success", title: "Postura Estavel", desc: "Tronco estavel" })
      if (Math.abs(angles.shoulderR - angles.shoulderL) > 15) fb.push({ type: "warning", title: "Bracos Assimetricos", desc: "Suba os dois bracos juntos" })
      else fb.push({ type: "success", title: "Simetria OK", desc: "Movimento simetrico" })
      if (phase === "Extensao Total") fb.push({ type: "success", title: "Extensao Completa", desc: "Bracos totalmente estendidos" })

      return { score: extS + leanS + symS + elbowS, feedback: fb, phase, details: { Extensao: extS, Postura: leanS, Simetria: symS, Cotovelos: elbowS } }
    }
  },

  // --- LATERAL RAISE / ELEVACAO LATERAL ---
  {
    id: "lateral_raise", name: "Elevacao Lateral", category: "bracos",
    muscles: ["Deltoides Lateral", "Trapezio", "Supraespinhoso"],
    phases: ["Bracos Baixos", "Elevacao", "Pico", "Retorno"],
    detect: (ctx) => {
      const { angles, lm, cal } = ctx
      if (cal.bodyOrientation === "horizontal") return 0
      const upright = angles.trunkAngle > 70 ? 20 : 5
      // Lateral raise: arms abduct laterally, elbows stay relatively extended
      const shoulderMid = (angles.shoulderR + angles.shoulderL) / 2
      const elbowExtended = (angles.elbowR + angles.elbowL) / 2 > 140 ? 25 : 10
      const shoulderAbduct = shoulderMid > 40 && shoulderMid < 120 ? 35 : 10
      const wristsBelowShoulders = (lm[16].y > lm[12].y || lm[16].y < lm[12].y) ? 20 : 10
      return upright + elbowExtended + shoulderAbduct + wristsBelowShoulders
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const shoulderAvg = (angles.shoulderR + angles.shoulderL) / 2
      const elbowAvg = (angles.elbowR + angles.elbowL) / 2
      const bodySwing = Math.abs(angles.trunkAngle - 90)
      const wristAboveElbow = lm[16].y < lm[14].y

      let phase = "Bracos Baixos"
      if (shoulderAvg >= 80) phase = "Pico"
      else if (shoulderAvg > 30) phase = ctx.prev.shoulderAngle < shoulderAvg ? "Elevacao" : "Retorno"

      const rangeS = shoulderAvg >= 85 ? 30 : shoulderAvg >= 60 ? 22 : shoulderAvg >= 30 ? 12 : 5
      const elbowS = elbowAvg > 150 ? 25 : elbowAvg > 130 ? 18 : 10
      const swingS = bodySwing < 10 ? 25 : bodySwing < 20 ? 18 : 10
      const symS = Math.abs(angles.shoulderR - angles.shoulderL) < 10 ? 20 : Math.abs(angles.shoulderR - angles.shoulderL) < 20 ? 12 : 5

      const fb: Feedback[] = []
      if (wristAboveElbow) fb.push({ type: "warning", title: "Punho Acima Cotovelo", desc: "Mantenha cotovelos na mesma altura ou acima dos punhos" })
      if (bodySwing > 15) fb.push({ type: "error", title: "Balanco Corporal", desc: "Nao use impulso do corpo" })
      else fb.push({ type: "success", title: "Corpo Estavel", desc: "Sem balanco" })
      if (shoulderAvg >= 80) fb.push({ type: "success", title: "Elevacao Completa", desc: "Bracos na altura dos ombros" })
      else if (shoulderAvg > 30) fb.push({ type: "info", title: "Suba Mais", desc: "Eleve ate a altura dos ombros" })

      return { score: rangeS + elbowS + swingS + symS, feedback: fb, phase, details: { Amplitude: rangeS, Cotovelos: elbowS, Estabilidade: swingS, Simetria: symS } }
    }
  },

  // --- PLANK / PRANCHA ---
  {
    id: "plank", name: "Prancha (Plank)", category: "tronco",
    muscles: ["Core", "Reto Abdominal", "Obliquos", "Eretores"],
    phases: ["Preparacao", "Sustentacao", "Fadiga"],
    detect: (ctx) => {
      const { lm, angles } = ctx
      // Plank: horizontal body, arms extended or on elbows, isometric hold
      const bodyHoriz = Math.abs(lm[12].y - lm[24].y) < 0.12
      const elbowsExtended = (angles.elbowR + angles.elbowL) / 2 > 150
      const feetBack = lm[28].x > lm[24].x || lm[28].x < lm[24].x
      const holdStill = true

      const horizS = bodyHoriz ? 45 : 10
      const formS = elbowsExtended ? 15 : 25 // elbows bent = low plank, both valid
      const feetS = feetBack ? 20 : 5
      return horizS + formS + feetS
    },
    evaluate: (ctx) => {
      const { angles, lm } = ctx
      const hipSag = avgY(lm[23], lm[24]) - ((avgY(lm[11], lm[12]) + avgY(lm[27], lm[28])) / 2)
      const hipPike = -hipSag
      const shoulderOverWrist = Math.abs(lm[12].x - lm[16].x)

      const phase = "Sustentacao"
      const alignS = Math.abs(hipSag) < 0.03 ? 35 : Math.abs(hipSag) < 0.06 ? 25 : Math.abs(hipSag) < 0.10 ? 15 : 5
      const shoulderS = shoulderOverWrist < 0.05 ? 25 : shoulderOverWrist < 0.10 ? 18 : 10
      const headS = Math.abs(lm[0].y - lm[12].y) < 0.15 ? 20 : 10
      const symS = Math.abs(lm[11].y - lm[12].y) < 0.02 ? 20 : Math.abs(lm[11].y - lm[12].y) < 0.04 ? 12 : 5

      const fb: Feedback[] = []
      if (hipSag > 0.06) fb.push({ type: "error", title: "Quadril Caindo", desc: "Ative o core e suba o quadril" })
      else if (hipPike > 0.06) fb.push({ type: "warning", title: "Quadril Alto", desc: "Abaixe o quadril para alinhar" })
      else fb.push({ type: "success", title: "Alinhamento Perfeito", desc: "Corpo em linha reta" })
      if (Math.abs(lm[0].y - lm[12].y) > 0.15) fb.push({ type: "info", title: "Cabeca Desalinhada", desc: "Olhe para o chao, pescoco neutro" })

      return { score: alignS + shoulderS + headS + symS, feedback: fb, phase, details: { Alinhamento: alignS, Ombros: shoulderS, Cabeca: headS, Simetria: symS } }
    }
  },
]

// ============================================================
// CLASSIFY EXERCISE — pick best match
// ============================================================
function classifyExercise(ctx: AnalysisCtx): { exercise: ExerciseDef; confidence: number } {
  let best = EXERCISES[0]
  let bestScore = 0
  for (const ex of EXERCISES) {
    const c = ex.detect(ctx)
    if (c > bestScore) { bestScore = c; best = ex }
  }
  return { exercise: best, confidence: bestScore }
}

// ============================================================
// UI HELPERS
// ============================================================
function scoreColor(s: number) { return s >= 80 ? "#166534" : s >= 60 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444" }
function scoreLabel(s: number) { return s >= 80 ? "Excelente" : s >= 60 ? "Bom" : s >= 40 ? "Regular" : "Corrigir" }
function categoryColor(c: string) { return c === "pernas" ? "#8b5cf6" : c === "bracos" ? "#f59e0b" : c === "tronco" ? "#ef4444" : "#06b6d4" }
function categoryIcon(c: string) { return c === "pernas" ? "🦵" : c === "bracos" ? "💪" : c === "tronco" ? "🏋️" : "⚡" }

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function IAVisionPage() {
  const [tab, setTab] = useState<"live" | "upload">("live")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [score, setScore] = useState(0)
  const [facing, setFacing] = useState<"user" | "environment">("environment")
  const [cameraKey, setCameraKey] = useState(0)
  const [reports, setReports] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [calibStatus, setCalibStatus] = useState<"waiting" | "calibrating" | "ready">("waiting")
  const [repCount, setRepCount] = useState(0)
  const [detectedExercise, setDetectedExercise] = useState<string>("")
  const [exerciseCategory, setExerciseCategory] = useState<string>("")
  const [exerciseConfidence, setExerciseConfidence] = useState(0)
  const [exerciseMuscles, setExerciseMuscles] = useState<string[]>([])

  const aRef = useRef<any>(null)
  const sRef = useRef(0)
  const t0 = useRef<Date | null>(null)
  const frames = useRef(0)
  const calibRef = useRef<CalibrationData>(createCalibration())
  const prevRef = useRef({ phase: "idle", hipY: 0, elbowAngle: 170, shoulderAngle: 10 })
  const repCountRef = useRef(0)
  const scoreHistRef = useRef<number[]>([])
  const exScoreRef = useRef(0)
  const exerciseVotesRef = useRef<Record<string, number>>({})
  const lockedExerciseRef = useRef<string | null>(null)
  const phaseHistoryRef = useRef<string[]>([])

  const onPose = useCallback((r: any) => {
    if (!r.poseLandmarks) return
    frames.current++
    const lm = r.poseLandmarks
    const cal = calibRef.current

    const angles = getAllAngles(lm)

    // --- CALIBRATION ---
    if (!cal.calibrated) {
      cal.frameCount++
      cal.samples.push({
        hipY: avgY(lm[23], lm[24]),
        kneeAngle: (angles.kneeR + angles.kneeL) / 2,
        elbowAngle: (angles.elbowR + angles.elbowL) / 2,
        shoulderAngle: (angles.shoulderR + angles.shoulderL) / 2,
      })

      if (cal.frameCount >= 30) {
        const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b)
        const med = (arr: number[]) => sorted(arr)[Math.floor(arr.length / 2)]
        cal.standingHipY = med(cal.samples.map((s: any) => s.hipY))
        cal.standingKneeAngle = med(cal.samples.map((s: any) => s.kneeAngle))
        cal.standingElbowAngle = med(cal.samples.map((s: any) => s.elbowAngle))
        cal.standingShoulderAngle = med(cal.samples.map((s: any) => s.shoulderAngle))
        cal.bodyHeight = Math.abs(avgY(lm[11], lm[12]) - avgY(lm[27], lm[28]))
        cal.shoulderWidth = Math.abs(lm[11].x - lm[12].x)
        // Detect body orientation
        const shoulderHipDiffY = Math.abs(avgY(lm[11], lm[12]) - avgY(lm[23], lm[24]))
        cal.bodyOrientation = shoulderHipDiffY < 0.12 ? "horizontal" : "upright"
        cal.calibrated = true
        setCalibStatus("ready")
      } else {
        setCalibStatus("calibrating")
        setAnalysis({
          angles: { kneeRight: angles.kneeR, kneeLeft: angles.kneeL, hipRight: angles.hipR, elbowRight: angles.elbowR },
          phase: "Calibrando...", feedback: [{ type: "info", title: "Calibracao", desc: "Mantenha a posicao... " + Math.round((cal.frameCount / 30) * 100) + "%" }],
          confidence: 0, landmarks: lm.length
        })
        return
      }
    }

    // --- BUILD CONTEXT ---
    const ctx: AnalysisCtx = { lm, angles, cal, prev: prevRef.current }

    // --- EXERCISE CLASSIFICATION (voting system) ---
    const { exercise: detectedEx, confidence: detConfidence } = classifyExercise(ctx)

    // Vote for exercise ID (stabilize detection over time)
    if (!exerciseVotesRef.current[detectedEx.id]) exerciseVotesRef.current[detectedEx.id] = 0
    exerciseVotesRef.current[detectedEx.id] += detConfidence

    // Lock exercise after enough votes (first 15 frames after calibration)
    const framesSinceCalib = frames.current - 30
    if (!lockedExerciseRef.current && framesSinceCalib >= 15) {
      let bestId = ""
      let bestVotes = 0
      for (const [id, votes] of Object.entries(exerciseVotesRef.current)) {
        if (votes > bestVotes) { bestVotes = votes; bestId = id }
      }
      lockedExerciseRef.current = bestId
    }

    // Use locked exercise or current best
    const activeExId = lockedExerciseRef.current || detectedEx.id
    const activeEx = EXERCISES.find(e => e.id === activeExId) || detectedEx

    setDetectedExercise(activeEx.name)
    setExerciseCategory(activeEx.category)
    setExerciseConfidence(Math.min(99, Math.round(detConfidence)))
    setExerciseMuscles(activeEx.muscles)

    // --- EVALUATE EXERCISE ---
    const result = activeEx.evaluate(ctx)

    // Rep counting
    const currentPhase = result.phase
    phaseHistoryRef.current.push(currentPhase)
    if (phaseHistoryRef.current.length > 5) phaseHistoryRef.current.shift()

    // Detect rep cycle based on exercise phases
    const phases = activeEx.phases
    if (phases.length >= 3) {
      const lastPhase = prevRef.current.phase
      const topPhase = phases[0]
      const bottomPhase = phases[2]
      if (lastPhase === phases[3] && currentPhase === topPhase) {
        repCountRef.current++
        setRepCount(repCountRef.current)
      }
    }

    // Update prev
    prevRef.current = {
      phase: currentPhase,
      hipY: avgY(lm[23], lm[24]),
      elbowAngle: (angles.elbowR + angles.elbowL) / 2,
      shoulderAngle: (angles.shoulderR + angles.shoulderL) / 2,
    }

    // Running average score
    scoreHistRef.current.push(result.score)
    if (scoreHistRef.current.length > 15) scoreHistRef.current.shift()
    const avgScore = Math.round(scoreHistRef.current.reduce((a, b) => a + b, 0) / scoreHistRef.current.length)
    exScoreRef.current = avgScore

    setAnalysis({
      angles: { kneeRight: angles.kneeR, kneeLeft: angles.kneeL, hipRight: angles.hipR, elbowRight: angles.elbowR, shoulderRight: angles.shoulderR, shoulderLeft: angles.shoulderL },
      phase: currentPhase,
      feedback: result.feedback,
      confidence: 98.4,
      landmarks: lm.length,
      details: result.details,
      exerciseName: activeEx.name,
      exerciseCategory: activeEx.category,
    })
  }, [])

  const onScore = useCallback((s: number) => {
    const exScore = exScoreRef.current
    const blended = calibRef.current.calibrated ? Math.round(exScore * 0.8 + s * 0.2) : Math.round(s)
    setScore(blended)
    sRef.current = blended
  }, [])

  const start = (url?: string) => {
    setAnalyzing(true); setVideoUrl(url || null); setAnalysis(null); setScore(0); setReport(null)
    t0.current = new Date(); frames.current = 0; setCameraKey(k => k + 1)
    calibRef.current = createCalibration()
    prevRef.current = { phase: "idle", hipY: 0, elbowAngle: 170, shoulderAngle: 10 }
    repCountRef.current = 0; setRepCount(0)
    scoreHistRef.current = []; exScoreRef.current = 0
    exerciseVotesRef.current = {}; lockedExerciseRef.current = null
    phaseHistoryRef.current = []
    setCalibStatus("waiting"); setDetectedExercise(""); setExerciseCategory("")
    setExerciseConfidence(0); setExerciseMuscles([])
  }

  const stop = () => {
    const rep = {
      id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString("pt-BR"),
      dur: t0.current ? Math.round((Date.now() - t0.current.getTime()) / 1000) + "s" : "0s",
      frames: frames.current, score: sRef.current, label: scoreLabel(sRef.current),
      phase: aRef.current?.phase || "N/A", angles: aRef.current?.angles ? { ...aRef.current.angles } : null,
      feedback: aRef.current?.feedback ? [...aRef.current.feedback] : [], confidence: aRef.current?.confidence || 0,
      reps: repCountRef.current, exerciseName: detectedExercise, exerciseCategory: exerciseCategory,
      muscles: exerciseMuscles, details: aRef.current?.details || {},
    }
    setReports(p => [rep, ...p].slice(0, 20)); setReport(rep); setAnalyzing(false); setVideoUrl(null)
  }

  const flipCamera = () => { setFacing(p => p === "user" ? "environment" : "user"); setCameraKey(k => k + 1) }

  // Keep refs in sync
  aRef.current = analysis

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl"><Camera className="w-5 h-5 sm:w-8 sm:h-8 text-white" /></div>
              Analise Biomecanica
            </h1>
            <p className="text-gym-text-secondary mt-1 text-xs sm:text-sm">Deteccao Multi-Exercicio - 33 Pontos - Auto-Calibracao</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {detectedExercise && analyzing && (
              <div className="px-3 py-1.5 rounded-lg border" style={{ backgroundColor: categoryColor(exerciseCategory) + "15", borderColor: categoryColor(exerciseCategory) + "40" }}>
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: categoryColor(exerciseCategory) }}>
                  <Dumbbell className="w-3.5 h-3.5" /> {categoryIcon(exerciseCategory)} {detectedExercise}
                </div>
              </div>
            )}
            {calibStatus === "ready" && (
              <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium"><Target className="w-3 h-3" /> Calibrado</div>
              </div>
            )}
            <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> IA ATIVA</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 border-b border-gym-border">
          {[{ k: "live", l: "Camera ao Vivo", i: Camera }, { k: "upload", l: "Upload de Video", i: Upload }].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k as any); if (!analyzing) setReport(null) }} className={"px-4 py-2 text-sm flex items-center gap-1.5 " + (tab === t.k ? "text-gym-accent border-b-2 border-gym-accent" : "text-gym-text-secondary hover:text-white")}>
              <t.i className="w-4 h-4" /> {t.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* ANALYZING VIEW */}
            {analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-3">
                <div className="flex gap-2">
                  {/* Score bar */}
                  <div className="hidden sm:flex flex-col items-center w-8">
                    <div className="relative w-6 rounded-full overflow-hidden flex-1 min-h-[200px]" style={{ background: "linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)" }}>
                      <div className="absolute bottom-0 left-0 right-0 bg-gym-dark/70 transition-all duration-500" style={{ height: (100 - score) + "%" }} />
                      <div className="absolute left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white rounded-full shadow transition-all duration-500" style={{ bottom: score + "%" }} />
                    </div>
                    <span className="text-xs font-bold mt-1" style={{ color: scoreColor(score) }}>{score}</span>
                  </div>
                  <div className="flex-1">
                    <div className="aspect-video bg-gym-darker rounded-lg overflow-hidden relative">
                      <MediaPipePoseDetection key={cameraKey} videoUrl={videoUrl || undefined} isLive={tab === "live"} facingMode={facing} onResults={onPose} onScoreUpdate={onScore} />
                      {/* Mobile score bar */}
                      <div className="sm:hidden absolute top-2 right-2">
                        <div className="w-3 h-20 rounded-full overflow-hidden relative" style={{ background: "linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)" }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all duration-500" style={{ height: (100 - score) + "%" }} />
                        </div>
                        <span className="text-[10px] font-bold block text-center" style={{ color: scoreColor(score) }}>{score}</span>
                      </div>
                      {/* Calibration overlay */}
                      {calibStatus === "calibrating" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                          <div className="bg-black/70 rounded-xl px-4 py-3 text-center">
                            <Target className="w-6 h-6 text-cyan-400 mx-auto mb-1 animate-pulse" />
                            <p className="text-cyan-400 text-xs font-semibold">Calibrando...</p>
                            <p className="text-white/70 text-[10px]">Mantenha a posicao por 1s</p>
                          </div>
                        </div>
                      )}
                      {/* Exercise name overlay */}
                      {detectedExercise && calibStatus === "ready" && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5" style={{ backgroundColor: categoryColor(exerciseCategory) + "CC", color: "white" }}>
                          {categoryIcon(exerciseCategory)} {detectedExercise}
                        </div>
                      )}
                      {/* Rep counter */}
                      {repCount > 0 && (
                        <div className="absolute bottom-2 right-2 bg-gym-accent/90 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {repCount} rep{repCount > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {tab === "live" && (
                        <button onClick={flipCamera} className="px-3 py-1.5 bg-gym-accent/20 text-gym-accent rounded-lg text-xs flex items-center gap-1.5">
                          <SwitchCamera className="w-3.5 h-3.5" /> {facing === "user" ? "Traseira" : "Frontal"}
                        </button>
                      )}
                      <button onClick={stop} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1.5">
                        <Square className="w-3.5 h-3.5" /> Parar e Gerar Relatorio
                      </button>
                      <div className="ml-auto flex items-center gap-2">
                        {repCount > 0 && <div className="px-2 py-1 bg-gym-accent/10 text-gym-accent rounded text-xs font-bold">{repCount} reps</div>}
                        <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: scoreColor(score) + "20", color: scoreColor(score) }}>
                          {scoreLabel(score)} {score}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* START SCREENS */}
            {tab === "live" && !analyzing && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Camera className="w-16 h-16 text-gym-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Camera ao Vivo</h3>
                <p className="text-gym-text-secondary text-sm mb-2">A IA detecta automaticamente o exercicio sendo executado</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {EXERCISES.map(ex => (
                    <span key={ex.id} className="px-2 py-0.5 bg-gym-darker rounded text-[10px] text-gym-text-muted">{categoryIcon(ex.category)} {ex.name}</span>
                  ))}
                </div>
                <button onClick={() => start()} className="px-6 py-3 bg-gym-accent text-white rounded-lg text-sm font-medium">Iniciar Analise</button>
              </div>
            )}

            {tab === "upload" && !analyzing && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Upload className="w-16 h-16 text-gym-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Upload de Video</h3>
                <p className="text-gym-text-secondary text-sm mb-4">Selecione um video do seu dispositivo</p>
                <input type="file" accept="video/*" className="hidden" id="vid-up" onChange={e => { const f = e.target.files?.[0]; if (f) start(URL.createObjectURL(f)) }} />
                <label htmlFor="vid-up" className="inline-block px-6 py-3 bg-gym-accent text-white rounded-lg cursor-pointer text-sm font-medium">Selecionar Video</label>
              </div>
            )}

            {/* REPORT */}
            {report && (
              <div className="bg-gym-card border border-gym-accent/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gym-accent" />
                    <h3 className="text-lg font-bold text-white">Relatorio da Analise</h3>
                  </div>
                  {report.exerciseName && (
                    <div className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: categoryColor(report.exerciseCategory) + "20", color: categoryColor(report.exerciseCategory) }}>
                      {categoryIcon(report.exerciseCategory)} {report.exerciseName}
                    </div>
                  )}
                </div>

                {/* Muscles */}
                {report.muscles?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {report.muscles.map((m: string) => (
                      <span key={m} className="px-2 py-0.5 bg-gym-accent/10 text-gym-accent rounded text-[10px] font-medium">{m}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-3xl font-black" style={{ color: scoreColor(report.score) }}>{report.score}</div><div className="text-xs text-gym-text-muted mt-1">Score</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.dur}</div><div className="text-xs text-gym-text-muted mt-1">Duracao</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.frames}</div><div className="text-xs text-gym-text-muted mt-1">Frames</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-gym-accent">{report.confidence}%</div><div className="text-xs text-gym-text-muted mt-1">Confianca</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-cyan-400">{report.reps || 0}</div><div className="text-xs text-gym-text-muted mt-1">Repeticoes</div></div>
                </div>

                {/* Feedback / Faults */}
                <div className="space-y-2 mb-4">
                  {report.feedback.map((f: any, i: number) => (
                    <div key={i} className={"p-3 rounded-lg border text-xs flex items-start gap-2 " + (f.type === "success" ? "bg-green-500/10 border-green-500/30" : f.type === "warning" ? "bg-yellow-500/10 border-yellow-500/30" : f.type === "error" ? "bg-red-500/10 border-red-500/30" : "bg-blue-500/10 border-blue-500/30")}>
                      {f.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <AlertCircle className={"w-4 h-4 flex-shrink-0 " + (f.type === "error" ? "text-red-400" : f.type === "warning" ? "text-yellow-400" : "text-blue-400")} />}
                      <div><span className="font-semibold">{f.title}</span>{" \u2014 "}{f.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Score breakdown */}
                {report.details && Object.keys(report.details).length > 0 && (
                  <div className="bg-gym-darker rounded-lg p-3 mb-4">
                    <p className="text-[10px] text-gym-text-muted font-semibold uppercase tracking-wider mb-2">Composicao do Score</p>
                    {Object.entries(report.details).map(([label, val]: any) => {
                      const max = label === "Profundidade" || label === "Hip Hinge" || label === "Amplitude" || label === "Extensao" || label === "Alinhamento" ? 30 : label === "Cabeca" || label === "Cotovelos" || label === "Estabilidade" ? 20 : 25
                      return (
                        <div key={label} className="flex items-center gap-2 text-xs mb-1">
                          <span className="text-gym-text-secondary w-24 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-gym-dark rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: ((val / max) * 100) + "%", backgroundColor: scoreColor((val / max) * 100) }} />
                          </div>
                          <span className="text-white font-bold w-10 text-right">{val}/{max}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {report.angles && <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Object.entries(report.angles).map(([k, v]: any) => (<div key={k} className="bg-gym-darker rounded p-2 flex justify-between"><span className="text-xs text-gym-text-secondary capitalize">{k.replace(/([A-Z])/g, " $1")}</span><span className="text-sm font-bold text-white">{v.toFixed(0)}{"\u00B0"}</span></div>))}</div>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setReport(null); start() }} className="px-4 py-2 bg-gym-accent text-white rounded-lg text-sm">Nova Analise</button>
                  <button onClick={() => setReport(null)} className="px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg text-sm">Fechar</button>
                </div>
              </div>
            )}

            {/* HISTORY */}
            {reports.length > 0 && !report && !analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Historico</h3>
                <div className="space-y-2">{reports.map(r => (
                  <button key={r.id} onClick={() => setReport(r)} className="w-full flex items-center gap-3 p-2 bg-gym-darker rounded-lg text-xs hover:bg-gym-hover text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: scoreColor(r.score) }}>{r.score}</div>
                    <div className="flex-1">
                      <span className="text-white font-medium">{r.exerciseName || "Exercicio"}</span>
                      <span className="text-gym-text-muted ml-2">{r.label} - {r.time} - {r.dur} - {r.reps || 0} reps</span>
                    </div>
                  </button>
                ))}</div>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* Exercise info card */}
            {detectedExercise && analyzing && (
              <div className="bg-gym-card border rounded-xl p-4" style={{ borderColor: categoryColor(exerciseCategory) + "40" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4" style={{ color: categoryColor(exerciseCategory) }} />
                  <h3 className="text-sm font-semibold text-white">Exercicio Detectado</h3>
                </div>
                <div className="text-center mb-3">
                  <div className="text-2xl mb-1">{categoryIcon(exerciseCategory)}</div>
                  <div className="text-lg font-bold text-white">{detectedExercise}</div>
                  <div className="text-xs font-medium capitalize mt-0.5" style={{ color: categoryColor(exerciseCategory) }}>{exerciseCategory}</div>
                </div>
                {exerciseMuscles.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {exerciseMuscles.map(m => (
                      <span key={m} className="px-1.5 py-0.5 bg-gym-darker rounded text-[9px] text-gym-text-secondary">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quality card */}
            <div className="bg-gym-card border border-gym-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gym-accent" /> Qualidade</h3>
              {analysis ? (
                <div className="space-y-3">
                  <div className="text-center"><div className="text-5xl font-black" style={{ color: scoreColor(score) }}>{score}</div><div className="text-sm font-semibold mt-1" style={{ color: scoreColor(score) }}>{scoreLabel(score)}</div></div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right,#ef4444,#eab308,#22c55e,#166534)" }}>
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow transition-all duration-500" style={{ left: "calc(" + score + "% - 6px)" }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gym-text-muted"><span>Corrigir</span><span>Regular</span><span>Bom</span><span>Excelente</span></div>
                  <div className="space-y-1.5 pt-2 border-t border-gym-border text-xs">
                    <div className="flex justify-between"><span className="text-gym-text-secondary">Fase</span><span className="text-white font-semibold">{analysis.phase}</span></div>
                    {repCount > 0 && <div className="flex justify-between"><span className="text-gym-text-secondary">Repeticoes</span><span className="text-cyan-400 font-semibold">{repCount}</span></div>}
                  </div>
                  {/* Score breakdown */}
                  {analysis.details && Object.keys(analysis.details).length > 0 && (
                    <div className="pt-2 border-t border-gym-border space-y-1.5">
                      <p className="text-[10px] text-gym-text-muted font-semibold uppercase tracking-wider">Composicao</p>
                      {Object.entries(analysis.details).map(([label, val]: any) => {
                        const max = label === "Profundidade" || label === "Hip Hinge" || label === "Amplitude" || label === "Extensao" || label === "Alinhamento" ? 30 : label === "Cabeca" || label === "Cotovelos" || label === "Estabilidade" ? 20 : 25
                        return (
                          <div key={label} className="flex items-center gap-2 text-xs">
                            <span className="text-gym-text-secondary w-20 flex-shrink-0 text-[10px]">{label}</span>
                            <div className="flex-1 h-1.5 bg-gym-darker rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: ((val / max) * 100) + "%", backgroundColor: scoreColor((val / max) * 100) }} />
                            </div>
                            <span className="text-white font-bold w-8 text-right text-[10px]">{val}/{max}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : <p className="text-gym-text-muted text-center py-6 text-sm">Inicie uma analise</p>}
            </div>
            {/* Feedback */}
            {analysis?.feedback?.length > 0 && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Feedback em Tempo Real</h3>
                <div className="space-y-2">{analysis.feedback.map((f: any, i: number) => (
                  <div key={i} className={"p-2 rounded text-xs flex items-center gap-2 " + (f.type === "success" ? "bg-green-500/10 text-green-400" : f.type === "warning" ? "bg-yellow-500/10 text-yellow-400" : f.type === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400")}>
                    {f.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}<span className="font-medium">{f.title}</span>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
