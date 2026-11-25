import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { templateInfo } from '@shared/templates';

/** The template the invitation is using now, so each CMS page can ask only for what that template shows. */
export function useActiveTemplate() {
  const { data } = useQuery({ queryKey: queryKeys.cms.theme, queryFn: cmsApi.theme.get, staleTime: 60_000 });
  return templateInfo(data?.templateId);
}
