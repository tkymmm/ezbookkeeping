import { ref, computed, watch } from 'vue';

import { useI18n } from '@/locales/helpers.ts';

import { useAccountsStore } from '@/stores/account.ts';

import type { TypeAndDisplayName } from '@/core/base.ts';
import { AccountCategory, AccountType } from '@/core/account.ts';
import type { LocalizedCurrencyInfo } from '@/core/currency.ts';
import type { LocalizedAccountCategory } from '@/core/account.ts';
import type { Account } from '@/models/account.ts';

import { setAccountSuitableIcon } from '@/lib/account.ts';

export interface DayAndDisplayName {
    readonly day: number;
    readonly displayName: string;
}

export function useAccountEditPageBaseBase() {
    const { tt, getAllCurrencies, getAllAccountCategories, getAllAccountTypes, getMonthdayShortName } = useI18n();
    const accountsStore = useAccountsStore();

    const editAccountId = ref<string | null>(null);
    const clientSessionId = ref<string>('');
    const loading = ref<boolean>(false);
    const submitting = ref<boolean>(false);
    const account = ref<Account>(accountsStore.generateNewAccountModel());
    const subAccounts = ref<Account[]>([]);

    const title = computed<string>(() => {
        if (!editAccountId.value) {
            return 'Add Account';
        } else {
            return 'Edit Account';
        }
    });

    const saveButtonTitle = computed<string>(() => {
        if (!editAccountId.value) {
            return 'Add';
        } else {
            return 'Save';
        }
    });

    const allAccountCategories = computed<LocalizedAccountCategory[]>(() => getAllAccountCategories());
    const allAccountTypes = computed<TypeAndDisplayName[]>(() => getAllAccountTypes());
    const allCurrencies = computed<LocalizedCurrencyInfo[]>(() => getAllCurrencies());

    const allAvailableMonthDays = computed<DayAndDisplayName[]>(() => {
        const allAvailableDays: DayAndDisplayName[] = [];

        allAvailableDays.push({
            day: 0,
            displayName: tt('Not set'),
        });

        for (let i = 1; i <= 28; i++) {
            allAvailableDays.push({
                day: i,
                displayName: getMonthdayShortName(i),
            });
        }

        return allAvailableDays;
    });

    const isAccountSupportCreditCardStatementDate = computed<boolean>(() => account.value && account.value.category === AccountCategory.CreditCard.type);

    function getAccountCreditCardStatementDate(statementDate?: number): string | null {
        for (const item of allAvailableMonthDays.value) {
            if (item.day === statementDate) {
                return item.displayName;
            }
        }

        return null;
    }

    function getInputEmptyProblemMessage(account: Account, isSubAccount: boolean): string | null {
        if (!isSubAccount && !account.category) {
            return 'Account category cannot be blank';
        } else if (!isSubAccount && !account.type) {
            return 'Account type cannot be blank';
        } else if (!account.name) {
            return 'Account name cannot be blank';
        } else if (account.type === AccountType.SingleAccount.type && !account.currency) {
            return 'Account currency cannot be blank';
        } else {
            return null;
        }
    }

    function isInputEmpty(): boolean {
        const isAccountEmpty = !!getInputEmptyProblemMessage(account.value, false);

        if (isAccountEmpty) {
            return true;
        }

        if (account.value.type === AccountType.MultiSubAccounts.type) {
            for (let i = 0; i < subAccounts.value.length; i++) {
                const isSubAccountEmpty = !!getInputEmptyProblemMessage(subAccounts.value[i], true);

                if (isSubAccountEmpty) {
                    return true;
                }
            }
        }

        return false;
    }

    function getAccountOrSubAccountProblemMessage(): string | null {
        let problemMessage = getInputEmptyProblemMessage(account.value, false);

        if (!problemMessage && account.value.type === AccountType.MultiSubAccounts.type) {
            for (let i = 0; i < subAccounts.value.length; i++) {
                problemMessage = getInputEmptyProblemMessage(subAccounts.value[i], true);

                if (problemMessage) {
                    break;
                }
            }
        }

        return problemMessage;
    }

    function addSubAccount(): boolean {
        if (account.value.type !== AccountType.MultiSubAccounts.type) {
            return false;
        }

        const subAccount = accountsStore.generateNewSubAccountModel(account.value);
        subAccounts.value.push(subAccount);
        return true;
    }

    function setAccount(newAccount: Account): void {
        account.value.from(newAccount);
        subAccounts.value = [];

        if (newAccount.childrenAccounts && newAccount.childrenAccounts.length > 0) {
            for (let i = 0; i < newAccount.childrenAccounts.length; i++) {
                const subAccount = accountsStore.generateNewSubAccountModel(account.value);
                subAccount.from(newAccount.childrenAccounts[i]);

                subAccounts.value.push(subAccount);
            }
        }
    }

    watch(() => account.value.category, (newValue, oldValue) => {
        setAccountSuitableIcon(account.value, oldValue, newValue);
    });

    return {
        // states
        editAccountId,
        clientSessionId,
        loading,
        submitting,
        account,
        subAccounts,
        // computed states
        title,
        saveButtonTitle,
        allAccountCategories,
        allAccountTypes,
        allCurrencies,
        allAvailableMonthDays,
        isAccountSupportCreditCardStatementDate,
        // functions
        getAccountCreditCardStatementDate,
        isInputEmpty,
        getAccountOrSubAccountProblemMessage,
        addSubAccount,
        setAccount
    };
}
