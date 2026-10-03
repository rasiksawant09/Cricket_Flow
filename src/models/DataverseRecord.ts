export interface DataverseRecord<TStatusCode extends number = number> {
  createdby?: string | null;
  createdon?: string | null;
  createdonbehalfby?: string | null;
  importsequencenumber?: number | null;
  modifiedby?: string | null;
  modifiedon?: string | null;
  modifiedonbehalfby?: string | null;
  overriddencreatedon?: string | null;
  ownerid?: string | null;
  owningbusinessunit?: string | null;
  owningteam?: string | null;
  owninguser?: string | null;
  statecode?: 0 | 1 | null;
  statuscode?: TStatusCode | null;
  timezoneruleversionnumber?: number | null;
  utcconversiontimezonecode?: number | null;
  versionnumber?: number | null;
}
