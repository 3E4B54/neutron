import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
    // Tenant -> assigned physical app instance ids.
    //
    // IMPORTANT: this module path is persistence-sensitive and intentionally
    // retains its historical name. Phase 9 also keeps physical ids as the
    // stored representation: (principal, logical app) uniqueness is derived
    // through memory/app_instances/v1 rather than by replacing this schema.
    // Typical tenants have only a handful of grants, so copying/scanning a
    // small [Text] remains preferable to a more complicated stable structure.
    public type Mem = {
        grants : Map.Map<Principal, [Text]>;
    };

    public func init() : Mem {
        {
            grants = Map.empty<Principal, [Text]>();
        };
    };
};
