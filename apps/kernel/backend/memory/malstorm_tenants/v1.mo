import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
    // Tenant -> assigned physical app instance ids.
    //
    // Intentionally simple for v1. Typical tenants will have only a
    // handful of grants, so copying/scanning a small [Text] is preferable
    // to introducing more complicated persistent structures.
    public type Mem = {
        grants : Map.Map<Principal, [Text]>;
    };

    public func init() : Mem {
        {
            grants = Map.empty<Principal, [Text]>();
        };
    };
};
