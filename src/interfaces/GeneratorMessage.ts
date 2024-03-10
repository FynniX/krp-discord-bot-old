export interface GeneratorMessage {
    type: "start" | "end" | "progress" | "result"
    memberId?: number
    modId?: number
    progress?: number
    success?: boolean
    filename?: string
    message?: string
}