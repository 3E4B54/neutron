# Properties

Properties is the native application wrapper for filesystem resource inspection.

The application delegates inspection to the FileManager/association services so
path, MIME/type, effective default handler, Atom identity and content metadata
are derived from the same canonical services used elsewhere.

Do not duplicate resource classification or association matching inside this
app. Changes to MIME names, `.sys`/`.neutron` semantics, or handler defaults
belong in filesystem/association policy and should automatically flow into
Properties.

`PropertiesApp.tsx` is presentation; `index.ts` registers the native app.
