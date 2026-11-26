# Architecture rules
- Keep segmented date entry in a stable shared component and validate/serialize dates on submission without UTC conversion, to preserve mobile typing and calendar dates.
- Share admission visibility keys between settings and form rendering; read settings before rendering the form without focus-based refetching, to avoid stale controls and input remounts while typing.
- Treat field visibility as presentation only, never as authorization; preserve existing database permissions and submission pipelines.- The applicant-facing session comes from form_settings `active_session` and is enforced by a BEFORE INSERT trigger for non-admins; forms only display it locked, so the lock cannot be bypassed from the browser.
