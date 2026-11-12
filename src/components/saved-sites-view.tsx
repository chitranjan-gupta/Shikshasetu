'use client';

import { useState, useEffect, useCallback, type FC } from 'react';
import { Trash2, ExternalLink, Globe, ChevronDown, ChevronRight, ShieldBan, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useUser, useAccount } from '@/hooks';
import { browserStorage } from '@/lib/browser';

export const SavedSitesView: FC = () => {
  const { t } = useTranslation();
  const { profiles, setProfile } = useUser();
  const { account } = useAccount();
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [localFallbackSites, setLocalFallbackSites] = useState<Record<string, Record<string, string>>>({});
  const [blockedSites, setBlockedSites] = useState<Record<string, boolean>>({});

  const currentProfile = profiles.length > 0 ? profiles[account] : null;

  // Load any sites and blocked sites directly from browserStorage.local as well
  const refreshStorageSites = useCallback(() => {
    browserStorage?.local?.get?.(['saved_sites', 'blocked_sites'])?.then?.((res: any) => {
      if (res?.saved_sites && typeof res.saved_sites === 'object') {
        setLocalFallbackSites(res.saved_sites);
      }
      if (res?.blocked_sites && typeof res.blocked_sites === 'object') {
        setBlockedSites(res.blocked_sites);
      }
    });
  }, []);

  useEffect(() => {
    refreshStorageSites();
    const listener = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.saved_sites) {
          setLocalFallbackSites(changes.saved_sites.newValue || {});
        }
        if (changes.blocked_sites) {
          setBlockedSites(changes.blocked_sites.newValue || {});
        }
      }
    };
    browserStorage?.onChanged?.addListener?.(listener);
    return () => {
      browserStorage?.onChanged?.removeListener?.(listener);
    };
  }, [refreshStorageSites]);

  const profileSites: Record<string, Record<string, string>> =
    (currentProfile as any)?.sites ?? {};

  // Merge profile sites with direct local storage sites
  const sitesMap: Record<string, Record<string, string>> = {
    ...localFallbackSites,
    ...profileSites,
  };
  const urls = Object.keys(sitesMap);
  const blockedUrls = Object.keys(blockedSites).filter((url) => blockedSites[url]);

  const handleUnblockSite = useCallback((urlToUnblock: string) => {
    setBlockedSites((prev) => {
      const next = { ...prev };
      delete next[urlToUnblock];
      browserStorage?.local?.set?.({ blocked_sites: next });
      return next;
    });
  }, []);

  const handleDeleteUrl = useCallback(
    (urlToDelete: string) => {
      const nextSites = { ...sitesMap };
      delete nextSites[urlToDelete];
      if (currentProfile) {
        setProfile({
          ...currentProfile,
          sites: nextSites,
        });
      }
      setLocalFallbackSites(nextSites);
      browserStorage?.local?.get?.(['sitesurls'])?.then?.((res: any) => {
        const nextSitesUrls = { ...(res?.sitesurls || {}) };
        delete nextSitesUrls[urlToDelete];
        browserStorage?.local?.set?.({
          saved_sites: nextSites,
          sitesurls: nextSitesUrls,
        });
      })?.catch?.(() => {
        browserStorage?.local?.set?.({ saved_sites: nextSites });
      });
      // Also remove any standalone key for this URL
      browserStorage?.local?.remove?.([urlToDelete]);
      if (expandedUrl === urlToDelete) {
        setExpandedUrl(null);
      }
    },
    [currentProfile, sitesMap, setProfile, expandedUrl]
  );

  const handleFieldChange = useCallback(
    (url: string, fieldKey: string, newValue: string) => {
      const nextSites = {
        ...sitesMap,
        [url]: {
          ...(sitesMap[url] || {}),
          [fieldKey]: newValue,
        },
      };
      if (currentProfile) {
        setProfile({
          ...currentProfile,
          sites: nextSites,
        });
      }
      setLocalFallbackSites(nextSites);
      browserStorage?.local?.set?.({ saved_sites: nextSites });
    },
    [currentProfile, sitesMap, setProfile]
  );

  const handleDeleteField = useCallback(
    (url: string, fieldKey: string) => {
      const urlFields = { ...(sitesMap[url] || {}) };
      delete urlFields[fieldKey];
      const nextSites = {
        ...sitesMap,
        [url]: urlFields,
      };
      if (currentProfile) {
        setProfile({
          ...currentProfile,
          sites: nextSites,
        });
      }
      setLocalFallbackSites(nextSites);
      browserStorage?.local?.set?.({ saved_sites: nextSites });
    },
    [currentProfile, sitesMap, setProfile]
  );

  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4" /> {t('savedSites', 'Captured Site Details')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('noSavedSitesDesc', 'Form details automatically recorded from visited job portals.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {urls.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
            {t('noSavedSites', 'No site details captured yet.')}
            <div className="text-xs mt-1 text-gray-400">
              {t('noSavedSitesDesc', 'When you submit or fill forms on career portals, their fields appear here.')}
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {urls.map((url) => {
              const isExpanded = expandedUrl === url;
              const fields = sitesMap[url] || {};
              const fieldKeys = Object.keys(fields);

              return (
                <div
                  key={url}
                  className="border rounded-md p-2.5 bg-gray-50 dark:bg-gray-800 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 font-medium text-left truncate flex-1 hover:text-blue-600"
                      onClick={() => setExpandedUrl(isExpanded ? null : url)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate" title={url}>
                        {url.replace(/^https?:\/\//, '')}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded">
                        {fieldKeys.length} {fieldKeys.length === 1 ? 'field' : 'fields'}
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-gray-400 hover:text-gray-700"
                        title="Open URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteUrl(url)}
                        title="Delete saved fields for this URL"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t space-y-2">
                      {fieldKeys.length === 0 ? (
                        <div className="text-gray-400 italic">No fields recorded.</div>
                      ) : (
                        fieldKeys.map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <span
                              className="w-28 shrink-0 font-mono text-[11px] text-gray-600 dark:text-gray-300 truncate"
                              title={key}
                            >
                              {key}:
                            </span>
                            <Input
                              value={fields[key]}
                              onChange={(e) =>
                                handleFieldChange(url, key, e.target.value)
                              }
                              className="h-7 text-xs flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-600"
                              onClick={() => handleDeleteField(url, key)}
                              title="Delete field"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Blocked / Disabled Sites Section */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-1.5 font-medium text-xs text-gray-700 dark:text-gray-200 mb-1">
            <ShieldBan className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t('blockedSites', 'Blocked Sites')}</span>
            {blockedUrls.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.2 rounded-full font-mono">
                {blockedUrls.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            {t('blockedSitesDesc', 'Websites where form saving prompts have been disabled.')}
          </p>

          {blockedUrls.length === 0 ? (
            <div className="text-center py-3 text-xs text-muted-foreground border border-dashed rounded-md bg-gray-50/50 dark:bg-gray-800/40">
              {t('noBlockedSites', 'No blocked sites')}
              <div className="text-[10px] mt-0.5 text-gray-400">
                {t('noBlockedSitesDesc', "Websites you choose 'Don't Save' for will appear here. You can re-enable them at any time.")}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {blockedUrls.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium" title={url}>
                      {url.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] flex items-center gap-1"
                      onClick={() => handleUnblockSite(url)}
                      title={t('reEnable', 'Re-enable')}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('reEnable', 'Re-enable')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
