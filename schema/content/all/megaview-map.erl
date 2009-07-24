% An erlang implementation of the mega-view.
fun({ThisDoc}) ->
    % return every field in the document which isn't 'reserved'
    User_fields = fun(Doc) ->
        RawFields = lists:filter( 
            fun({K, _V}) -> 
                case K of
                % leading '_'
                <<$_, _/binary >>            -> false;
                % leading 'rd_'
                <<$r, $d, $_, _/binary >>    -> false;
                % else...
                _                            -> true
               end
            end,
            Doc),
        case proplists:get_value(<<"rd_megaview_expandable">>, Doc) of
        undefined ->
            % result is just the raw fields.
            RawFields;
        Expandable ->
            % there is a rd_megaview_expandable field - process it
            % any field value in 'rd_megaview_expandable' will be a nested list.
            lists:flatten(
                lists:map(
                    fun({K, V}) ->
                        case lists:any( fun(X) -> K==X end, Expandable) of
                        true  -> lists:map( fun(Y) -> {K, Y} end, V);
                        false -> {K,V}
                        end
                    end,
                    RawFields
                )
            )
        end
    end,

    Emit_for_rd_item = fun(Doc, SchemaID) ->
        RDKey = proplists:get_value(<<"rd_key">>, Doc),
        ExtID = proplists:get_value(<<"rd_ext_id">>, Doc),
        SchemaConf = proplists:get_value(<<"rd_schema_confidence">>, Doc),
        % we don't emit the revision from the source in the key.
        RDSource = proplists:get_value(<<"rd_source">>, Doc),
        SrcVal = case RDSource of
                    null -> null;
                    _    -> hd(RDSource)
                end,

        % The value that gets written for every row we write.
        Value = {[ {<<"_rev">>, proplists:get_value(<<"_rev">>, Doc)},
                   {<<"rd_key">>, proplists:get_value(<<"rd_key">>, Doc)},
                   {<<"rd_ext">>, ExtID},
                   {<<"rd_schema_id">>, SchemaID},
                   {<<"rd_source">>, RDSource}
                ]},

        Fixed = [
            {[<<"rd.core.content">>, <<"key">>, RDKey]},
            {[<<"rd.core.content">>, <<"schema_id">>, SchemaID]},
            {[<<"rd.core.content">>, <<"key-schema_id">>, [RDKey, SchemaID]]},
            {[<<"rd.core.content">>, <<"ext_id">>, ExtID]},
            {[<<"rd.core.content">>, <<"ext_id-schema_id">>, [ExtID, SchemaID]]},
            {[<<"rd.core.content">>, <<"source">>, SrcVal]},
            {[<<"rd.core.content">>, <<"key-source">>, [RDKey, SrcVal]]},
            {[<<"rd.core.content">>, <<"ext_id-source">>, [ExtID, SrcVal]]},
            % a condition
            {[<<"rd.core.content">>, <<"rd_schema_confidence">>, SchemaConf], SchemaConf}
        ],

        FilteredFixed = lists:map( 
            fun(K) -> element(1, K) end,
            lists:filter( 
               fun(V) -> 
                   case V of
                   {_Key} -> true;
                   {_Key, null} -> false;
                   {_Key, undefined} -> false;
                   {_Key, _} -> true
                   end
               end,
               Fixed
            )
        ),

        % If this schema doesn't want/need values indexed, don't fetch them.
        AllKeys = case proplists:get_value(<<"rd_megaview_ignore_values">>, Doc) of
        undefined ->
            % fetch the user fields too...
            UserKeys = lists:map(
                fun({K, V}) ->
                    % emit null if a string value > 140 chars is seen.
                    NV = case V of 
                            <<_:(140*8), _/binary>> -> null;
                            _                       -> V
                        end,
                    [SchemaID, K, NV]
                end,
                User_fields(Doc)
            ),
            FilteredFixed ++ UserKeys;
        _ ->
            FilteredFixed
        end,
        % finally the results
        lists:map( 
         fun(K) -> [K, Value] end, 
         AllKeys )
    end,

    case proplists:get_value(<<"rd_megaview_ingore_doc">>, ThisDoc) of
    undefined ->
        SchemaID = proplists:get_value(<<"rd_schema_id">>, ThisDoc),
        case SchemaID of
            undefined -> [];
            _         -> Emit_for_rd_item(ThisDoc, SchemaID)
        end;
    _ -> []
    end
end.
