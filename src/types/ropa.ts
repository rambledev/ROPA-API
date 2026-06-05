export type RopaSection2 = {
  activityDetail: string
  purposes: Array<"education" | "hr" | "research" | "academic_service" | "internal_management" | "other">
  purposeOther: string
  purposeDetail: string
}

export type RopaSection3 = {
  dataSubjects: Array<"student" | "applicant" | "alumni" | "staff" | "employee" | "contractor" | "researcher" | "research_volunteer" | "trainee" | "visitor" | "it_user" | "other">
  dataSubjectOther: string
}

export type RopaSection4 = {
  generalData: Array<"name" | "id_card" | "birthdate" | "gender" | "address" | "phone" | "email" | "photo" | "education" | "work" | "financial" | "other">
  generalDataOther: string
  sensitiveData: Array<"race" | "religion" | "health" | "biometric" | "criminal" | "disability" | "none" | "other">
  sensitiveDataOther: string
}

export type RopaSection5 = {
  legalBases: Array<"legal_obligation" | "public_task" | "contract" | "consent" | "legitimate_interest" | "vital_interest" | "historical_research">
  legalBasisDetail: string
}

export type RopaSection6 = {
  sources: Array<"data_subject" | "internal" | "external" | "information_system" | "website" | "application" | "other">
  sourceOther: string
}

export type RopaSection7 = {
  internalRecipients: string
  externalRecipients: string
  disclosureReason: string
}

export type RopaSection8 = {
  hasTransfer: boolean
  destinationCountry: string
  safeguardMeasures: string
}

export type RopaSection9 = {
  systems: Array<"student_registry" | "hr_system" | "e_document" | "lms" | "erp" | "website" | "cloud" | "ai" | "other">
  systemOther: string
}

export type RopaSection10 = {
  retentionPeriod: string
  legalReference: string
  destructionMethods: Array<"delete_system" | "destroy_document" | "destroy_media" | "other">
  destructionOther: string
}

export type RopaSection11 = {
  technicalMeasures: Array<"access_control" | "mfa" | "encryption" | "firewall" | "antivirus" | "backup" | "log_monitoring">
  adminMeasures: Array<"pdpa_policy" | "staff_training" | "nda" | "risk_management">
}

export type RopaSectionDataMap = {
  2: RopaSection2
  3: RopaSection3
  4: RopaSection4
  5: RopaSection5
  6: RopaSection6
  7: RopaSection7
  8: RopaSection8
  9: RopaSection9
  10: RopaSection10
  11: RopaSection11
}

export type RopaSectionNumber = keyof RopaSectionDataMap
